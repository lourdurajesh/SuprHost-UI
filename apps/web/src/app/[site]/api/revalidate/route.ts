import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { isSiteKey } from "@/lib/sites";

// Called by the PMS after a host saves website content, so changes show on the next visit
// instead of when the hour-long cache runs out. Signed with the same scheme the website uses
// towards the PMS (HMAC over method, path, timestamp and body hash); anything else is refused.

const MAX_SKEW_SECONDS = 60;

function verify(request: NextRequest, body: string): boolean {
  const keyId = process.env.PMS_API_KEY_ID;
  const secret = process.env.PMS_API_SECRET;
  if (!keyId || !secret || secret.length < 32) return false;
  if (request.headers.get("x-suprhost-key") !== keyId) return false;

  const timestamp = request.headers.get("x-suprhost-timestamp") ?? "";
  const seconds = Number(timestamp);
  const now = (performance.timeOrigin + performance.now()) / 1000;
  if (!Number.isFinite(seconds) || Math.abs(now - seconds) > MAX_SKEW_SECONDS) return false;

  const bodyHash = createHash("sha256").update(body).digest("hex");
  const expected = createHmac("sha256", secret).update(`POST\n/api/revalidate\n${timestamp}\n${bodyHash}`).digest("base64url");
  const given = request.headers.get("x-suprhost-signature") ?? "";
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest, ctx: RouteContext<"/[site]/api/revalidate">) {
  const { site } = await ctx.params;
  const body = await request.text();
  if (!isSiteKey(site) || body.length > 2048 || !verify(request, body)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let parsed: { site?: unknown; tags?: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  // The PMS names the site it changed; it must be the site this host serves, and every tag must
  // belong to it, so one tenant's save can never flush another tenant's pages.
  const tags = Array.isArray(parsed.tags) ? parsed.tags.filter((t): t is string => typeof t === "string") : [];
  if (parsed.site !== site || tags.length === 0 || tags.some((t) => t !== `site:${site}` && !t.startsWith(`listing:${site}:`) && t !== `listings:${site}`)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: tags });
}
