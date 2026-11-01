import { NextResponse, type NextRequest } from "next/server";
import { cancelBooking, PmsError } from "@/lib/pms";
import { clientIp, isSameOrigin, rateLimit } from "@/lib/security";
import { readSessionToken } from "@/lib/session";
import { isSiteKey } from "@/lib/sites";
import { bookingToken } from "@/lib/validation";

// Cancels a booking from My trips. The PMS applies the site's cancellation rule and checks that
// the signed-in guest owns the booking; this handler adds origin, rate and input checks.
export async function POST(request: NextRequest, ctx: RouteContext<"/[site]/api/bookings/[token]/cancel">) {
  const { site, token } = await ctx.params;
  if (!isSiteKey(site) || !bookingToken.safeParse(token).success) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const session = await readSessionToken();
  if (!session) return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
  const ip = clientIp(request);
  if (!rateLimit("manage:ip", ip, 10, 10 * 60_000) || !rateLimit("manage:token", token, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "600" } });
  }

  try {
    const result = await cancelBooking(site, token, { clientIp: ip, userAgent: request.headers.get("user-agent") ?? "", turnstileToken: null, idempotencyKey: crypto.randomUUID() }, session);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof PmsError && [401, 404, 422].includes(e.status)) {
      return NextResponse.json({ error: e.code, message: e.status === 422 ? e.message : undefined }, { status: e.status });
    }
    console.error("cancel failed", { site, status: e instanceof PmsError ? e.status : undefined });
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
