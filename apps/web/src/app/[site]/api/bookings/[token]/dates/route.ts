import { NextResponse, type NextRequest } from "next/server";
import { changeBookingDates, PmsError } from "@/lib/pms";
import { clientIp, isSameOrigin, rateLimit } from "@/lib/security";
import { readSessionToken } from "@/lib/session";
import { isSiteKey } from "@/lib/sites";
import { bookingToken, changeDatesBody } from "@/lib/validation";

// Moves a booking to new dates from My trips. The PMS re-prices it, checks the dates and the
// change window, and checks that the signed-in guest owns the booking.
export async function POST(request: NextRequest, ctx: RouteContext<"/[site]/api/bookings/[token]/dates">) {
  const { site, token } = await ctx.params;
  if (!isSiteKey(site) || !bookingToken.safeParse(token).success) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "unsupported_media_type" }, { status: 415 });
  }

  const session = await readSessionToken();
  if (!session) return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
  const ip = clientIp(request);
  if (!rateLimit("manage:ip", ip, 10, 10 * 60_000) || !rateLimit("manage:token", token, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "600" } });
  }
  const parsed = changeDatesBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", message: "Choose valid dates." }, { status: 400 });

  try {
    const booking = await changeBookingDates(site, token, parsed.data, { clientIp: ip, userAgent: request.headers.get("user-agent") ?? "", turnstileToken: null, idempotencyKey: crypto.randomUUID() }, session);
    return NextResponse.json(booking);
  } catch (e) {
    if (e instanceof PmsError && [401, 404, 409, 422].includes(e.status)) {
      const message = e.status === 409 ? "Those dates aren’t available." : e.status === 422 ? e.message : undefined;
      return NextResponse.json({ error: e.code, message }, { status: e.status });
    }
    console.error("date change failed", { site, status: e instanceof PmsError ? e.status : undefined });
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
