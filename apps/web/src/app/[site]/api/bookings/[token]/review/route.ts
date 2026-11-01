import { NextResponse, type NextRequest } from "next/server";
import { PmsError, submitReview } from "@/lib/pms";
import { clientIp, isSameOrigin, rateLimit } from "@/lib/security";
import { isSiteKey } from "@/lib/sites";
import { bookingToken, reviewBody } from "@/lib/validation";

// A guest's review of a completed stay. The booking token is the credential (it arrives in the
// review email); the PMS checks the stay ended and that it hasn't been reviewed yet.
export async function POST(request: NextRequest, ctx: RouteContext<"/[site]/api/bookings/[token]/review">) {
  const { site, token } = await ctx.params;
  if (!isSiteKey(site) || !bookingToken.safeParse(token).success) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "unsupported_media_type" }, { status: 415 });
  }
  const ip = clientIp(request);
  if (!rateLimit("review:ip", ip, 10, 60 * 60_000) || !rateLimit("review:token", token, 3, 60 * 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "3600" } });
  }
  const parsed = reviewBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", message: "Choose a rating and write at least a sentence." }, { status: 400 });

  try {
    await submitReview(site, token, parsed.data, { clientIp: ip, userAgent: request.headers.get("user-agent") ?? "", turnstileToken: null, idempotencyKey: crypto.randomUUID() });
    return NextResponse.json({ status: "received" }, { status: 201 });
  } catch (e) {
    if (e instanceof PmsError && [404, 409, 422].includes(e.status)) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    console.error("review failed", { site, status: e instanceof PmsError ? e.status : undefined });
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
