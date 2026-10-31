import { NextResponse, type NextRequest } from "next/server";
import { createBooking, PmsError } from "@/lib/pms";
import { clientIp, isDisposableEmail, isSameOrigin, rateLimit, verifyTurnstile } from "@/lib/security";
import { isSiteKey } from "@/lib/sites";
import { createBookingBody } from "@/lib/validation";

const MIN_FILL_MS = 3000;
const MAX_BODY_BYTES = 8 * 1024;

// Bots that trip a silent check get a response shaped like success so they learn nothing, but no
// booking is created and no dates are held. The token is unusable, so they hit a 404 next.
function silentlyAccept() {
  return NextResponse.json({ token: "x".repeat(32), reference: "RECEIVED", status: "pending_payment" }, { status: 201 });
}

export async function POST(request: NextRequest, ctx: RouteContext<"/[site]/api/bookings">) {
  const { site } = await ctx.params;
  if (!isSiteKey(site)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "unsupported_media_type" }, { status: 415 });
  }

  const ip = clientIp(request);
  if (!rateLimit("booking:ip", ip, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "600" } });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = createBookingBody.safeParse(json);
  if (!parsed.success) {
    // A filled honeypot is a bot, not a typo.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return silentlyAccept();
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? "form"), i.message]));
    return NextResponse.json({ error: "invalid_request", fields }, { status: 400 });
  }

  const { elapsedMs, turnstileToken, idempotencyKey, listingId, checkIn, checkOut, guests, name, email, phone, message } =
    parsed.data;
  if (elapsedMs < MIN_FILL_MS) return silentlyAccept();
  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: "invalid_request", fields: { email: "Please use a permanent email address" } }, { status: 400 });
  }
  if (!rateLimit("booking:email", email, 3, 60 * 60_000) || !rateLimit("booking:phone", phone, 3, 60 * 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "3600" } });
  }
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json({ error: "challenge_failed" }, { status: 403 });
  }

  try {
    const hold = await createBooking(
      site,
      { listingId, checkIn, checkOut, guests, name, email, phone, message },
      { clientIp: ip, userAgent: request.headers.get("user-agent") ?? "", turnstileToken, idempotencyKey },
    );
    return NextResponse.json(hold, { status: 201 });
  } catch (e) {
    if (e instanceof PmsError && e.status === 409) return NextResponse.json({ error: "dates_unavailable" }, { status: 409 });
    if (e instanceof PmsError && e.status === 422) return NextResponse.json({ error: e.code, message: e.message }, { status: 422 });
    console.error("booking create failed", { site, status: e instanceof PmsError ? e.status : undefined });
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
