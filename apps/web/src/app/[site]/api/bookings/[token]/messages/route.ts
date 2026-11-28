import { NextResponse, type NextRequest } from "next/server";
import { getConversation, PmsError, sendGuestMessage } from "@/lib/pms";
import { clientIp, isSameOrigin, rateLimit } from "@/lib/security";
import { isSiteKey } from "@/lib/sites";
import { bookingToken, messageBody } from "@/lib/validation";

// The guest's side of the guest–host conversation about a request or booking. The booking token
// is the credential, as for the booking page itself; the PMS emails the host about new messages.
export async function GET(_request: NextRequest, ctx: RouteContext<"/[site]/api/bookings/[token]/messages">) {
  const { site, token } = await ctx.params;
  if (!isSiteKey(site) || !bookingToken.safeParse(token).success) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const conversation = await getConversation(site, token);
    if (!conversation) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(conversation, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("messages failed", { site, status: e instanceof PmsError ? e.status : undefined });
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}

export async function POST(request: NextRequest, ctx: RouteContext<"/[site]/api/bookings/[token]/messages">) {
  const { site, token } = await ctx.params;
  if (!isSiteKey(site) || !bookingToken.safeParse(token).success) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "unsupported_media_type" }, { status: 415 });
  }
  const ip = clientIp(request);
  if (!rateLimit("message:ip", ip, 30, 10 * 60_000) || !rateLimit("message:token", token, 20, 10 * 60_000)) {
    return NextResponse.json({ error: "rate_limited", message: "You’re sending messages very fast. Wait a few minutes and try again." }, { status: 429, headers: { "Retry-After": "600" } });
  }
  const parsed = messageBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", message: "Write a message of up to 2,000 characters." }, { status: 400 });

  try {
    const conversation = await sendGuestMessage(site, token, parsed.data.body, {
      clientIp: ip,
      userAgent: request.headers.get("user-agent") ?? "",
      turnstileToken: null,
      idempotencyKey: crypto.randomUUID(),
    });
    return NextResponse.json(conversation);
  } catch (e) {
    if (e instanceof PmsError && [404, 422].includes(e.status)) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    console.error("send message failed", { site, status: e instanceof PmsError ? e.status : undefined });
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
