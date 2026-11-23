import { createHmac } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { recordFunnelVisit } from "@/lib/pms";
import { clientIp, isSameOrigin, rateLimit } from "@/lib/security";
import { isSiteKey } from "@/lib/sites";

// Anonymous funnel counting (home → stay → price → checkout). Cookieless: the visitor is a hash of
// site + IP + user agent keyed with a secret that changes every day, so the same person on two
// days is two unrelated hashes and nothing here can be traced to anyone. The raw IP and user agent
// are never stored or sent on. Answers 204 whatever happens: counting must never affect a page.
const STEPS = new Set(["home", "stay", "quote", "checkout"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python-requests/i;

const done = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest, ctx: RouteContext<"/[site]/api/e">) {
  const { site } = await ctx.params;
  const salt = process.env.FUNNEL_SALT ?? process.env.PMS_API_SECRET;
  const ua = request.headers.get("user-agent") ?? "";
  // Honour Global Privacy Control and Do Not Track, skip robots, and only count our own pages.
  if (!salt || !isSiteKey(site) || !isSameOrigin(request) || BOT.test(ua)) return done();
  if (request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1") return done();

  const ip = clientIp(request);
  if (!rateLimit("e", ip, 120, 60_000)) return done();

  let body: { step?: unknown; listing?: unknown };
  try {
    body = JSON.parse((await request.text()).slice(0, 512));
  } catch {
    return done();
  }
  if (typeof body.step !== "string" || !STEPS.has(body.step)) return done();
  const listing = typeof body.listing === "string" && UUID.test(body.listing) ? body.listing.toLowerCase() : undefined;

  const day = new Date().toISOString().slice(0, 10);
  const visitor = createHmac("sha256", `${salt}:${day}`).update(`${site}|${ip}|${ua}`).digest("hex").slice(0, 32);
  // After the response, so tracking never adds latency; errors are swallowed on purpose.
  after(() => recordFunnelVisit(site, { step: body.step as string, listing, visitor }, ip).catch(() => undefined));
  return done();
}
