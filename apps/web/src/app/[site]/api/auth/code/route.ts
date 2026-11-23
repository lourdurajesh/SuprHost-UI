import { NextResponse, type NextRequest } from "next/server";
import { PmsError, requestSignInCode } from "@/lib/pms";
import type { SignInLogin } from "@/lib/pms/types";
import { clientIp, isSameOrigin, rateLimit, verifyTurnstile } from "@/lib/security";
import { isSiteKey } from "@/lib/sites";
import { signInCodeBody } from "@/lib/validation";

// Always answers 202 with the same body, whether or not the email or number has bookings, so the
// endpoint can't be used to discover who has stayed here.
const accepted = () => NextResponse.json({ status: "sent" }, { status: 202 });

export async function POST(request: NextRequest, ctx: RouteContext<"/[site]/api/auth/code">) {
  const { site } = await ctx.params;
  if (!isSiteKey(site)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ip = clientIp(request);
  if (!rateLimit("signin-code:ip", ip, 5, 15 * 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "900" } });
  }

  const raw = await request.json().catch(() => null);
  // Honeypot filled in: a bot. Same answer as everyone, nothing sent.
  if (raw && typeof raw === "object" && typeof (raw as { website?: unknown }).website === "string" && (raw as { website: string }).website !== "") {
    return accepted();
  }
  const parsed = signInCodeBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", message: "Enter a valid email or mobile number" }, { status: 400 });
  }
  const { turnstileToken } = parsed.data;
  const login: SignInLogin = "mobile" in parsed.data ? { mobile: parsed.data.mobile } : { email: parsed.data.email };
  // At most 3 codes per email or number per 15 minutes, whoever asks (each SMS costs the host).
  const loginKey = "mobile" in login ? login.mobile : login.email;
  if (!rateLimit("signin-code:login", loginKey, 3, 15 * 60_000)) return accepted();
  if (!(await verifyTurnstile(turnstileToken, ip))) return NextResponse.json({ error: "challenge_failed" }, { status: 403 });

  try {
    const { testModeCode } = await requestSignInCode(site, login, {
      clientIp: ip,
      userAgent: request.headers.get("user-agent") ?? "",
      turnstileToken,
      idempotencyKey: crypto.randomUUID(),
    });
    // Development and demos (PublicApi:ExposeSignInCodes): hand the code back so the tester can sign in.
    if (testModeCode) return NextResponse.json({ status: "sent", testModeCode }, { status: 202 });
  } catch (e) {
    // The provider being down says nothing about the address, so the guest is told to retry
    // instead of waiting for a code that will never come. Other failures keep the same answer.
    if (e instanceof PmsError && e.status === 503) {
      return NextResponse.json({ error: "mobile" in login ? "sms_unavailable" : "email_unavailable" }, { status: 503, headers: { "Retry-After": "60" } });
    }
    // Phone sign-in rules the guest can act on: only Indian numbers, or a code was just sent.
    if (e instanceof PmsError && e.status === 422 && "mobile" in login) {
      return NextResponse.json({ error: "invalid_request", message: e.message }, { status: 422 });
    }
    console.error("sign-in code request failed", { site });
  }
  return accepted();
}
