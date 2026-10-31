import { NextResponse, type NextRequest } from "next/server";
import { requestSignInCode } from "@/lib/pms";
import { clientIp, isSameOrigin, rateLimit, verifyTurnstile } from "@/lib/security";
import { isSiteKey } from "@/lib/sites";
import { signInCodeBody } from "@/lib/validation";

// Always answers 202 with the same body, whether or not the email has bookings, so the endpoint
// can't be used to discover who has stayed here.
const accepted = () => NextResponse.json({ status: "sent" }, { status: 202 });

export async function POST(request: NextRequest, ctx: RouteContext<"/[site]/api/auth/code">) {
  const { site } = await ctx.params;
  if (!isSiteKey(site)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ip = clientIp(request);
  if (!rateLimit("signin-code:ip", ip, 5, 15 * 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "900" } });
  }

  const parsed = signInCodeBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return accepted();
    return NextResponse.json({ error: "invalid_request", message: "Enter a valid email" }, { status: 400 });
  }
  const { email, turnstileToken } = parsed.data;
  if (!rateLimit("signin-code:email", email, 3, 15 * 60_000)) return accepted();
  if (!(await verifyTurnstile(turnstileToken, ip))) return NextResponse.json({ error: "challenge_failed" }, { status: 403 });

  try {
    const { testModeCode } = await requestSignInCode(site, email, {
      clientIp: ip,
      userAgent: request.headers.get("user-agent") ?? "",
      turnstileToken,
      idempotencyKey: crypto.randomUUID(),
    });
    // Mock data only (no email provider): hand the code back so the tester can sign in.
    if (testModeCode) return NextResponse.json({ status: "sent", testModeCode }, { status: 202 });
  } catch {
    // Same answer either way; failures are visible in server logs and PMS metrics.
    console.error("sign-in code request failed", { site });
  }
  return accepted();
}
