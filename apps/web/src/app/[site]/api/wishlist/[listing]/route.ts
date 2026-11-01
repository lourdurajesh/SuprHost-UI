import { NextResponse, type NextRequest } from "next/server";
import { PmsError, setWishlisted } from "@/lib/pms";
import { clientIp, isSameOrigin, rateLimit } from "@/lib/security";
import { readSessionToken } from "@/lib/session";
import { isSiteKey } from "@/lib/sites";
import { z } from "zod";

const listingId = z.string().uuid();

async function handle(request: NextRequest, ctx: RouteContext<"/[site]/api/wishlist/[listing]">, saved: boolean) {
  const { site, listing } = await ctx.params;
  if (!isSiteKey(site) || !listingId.safeParse(listing).success) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const session = await readSessionToken();
  if (!session) return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
  const ip = clientIp(request);
  if (!rateLimit("wishlist:ip", ip, 60, 10 * 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "600" } });
  }
  try {
    await setWishlisted(site, session, listing, saved, { clientIp: ip, userAgent: request.headers.get("user-agent") ?? "", turnstileToken: null, idempotencyKey: crypto.randomUUID() });
    return NextResponse.json({ saved });
  } catch (e) {
    if (e instanceof PmsError && [401, 404, 422].includes(e.status)) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}

export const PUT = (request: NextRequest, ctx: RouteContext<"/[site]/api/wishlist/[listing]">) => handle(request, ctx, true);
export const DELETE = (request: NextRequest, ctx: RouteContext<"/[site]/api/wishlist/[listing]">) => handle(request, ctx, false);
