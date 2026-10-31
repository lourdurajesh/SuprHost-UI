import { NextResponse, type NextRequest } from "next/server";
import { payBooking, PmsError } from "@/lib/pms";
import { clientIp, isSameOrigin, rateLimit } from "@/lib/security";
import { isSiteKey } from "@/lib/sites";
import { bookingToken, paymentBody } from "@/lib/validation";

// Starts payment for a held booking. The PMS decides what happens through the tenant's payment
// plugin: "simulated" confirms at once (v0.1); a real gateway returns requires_action + redirectUrl.

export async function POST(request: NextRequest, ctx: RouteContext<"/[site]/api/bookings/[token]/payments">) {
  const { site, token } = await ctx.params;
  if (!isSiteKey(site) || !bookingToken.safeParse(token).success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "unsupported_media_type" }, { status: 415 });
  }

  const ip = clientIp(request);
  if (!rateLimit("payment:ip", ip, 10, 10 * 60_000) || !rateLimit("payment:token", token, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "600" } });
  }

  const parsed = paymentBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  try {
    const result = await payBooking(
      site,
      token,
      { method: parsed.data.method },
      { clientIp: ip, userAgent: request.headers.get("user-agent") ?? "", turnstileToken: null, idempotencyKey: parsed.data.idempotencyKey },
    );
    if (result.redirectUrl && !result.redirectUrl.startsWith("https://")) {
      return NextResponse.json({ error: "unavailable" }, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof PmsError && [404, 409, 410, 422].includes(e.status)) {
      return NextResponse.json({ error: e.code }, { status: e.status });
    }
    console.error("payment failed", { site, status: e instanceof PmsError ? e.status : undefined });
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
