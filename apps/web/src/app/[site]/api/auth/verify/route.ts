import { NextResponse, type NextRequest } from "next/server";
import { PmsError, verifySignInCode } from "@/lib/pms";
import { clientIp, isSameOrigin, rateLimit } from "@/lib/security";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { isSiteKey } from "@/lib/sites";
import { signInVerifyBody } from "@/lib/validation";

export async function POST(request: NextRequest, ctx: RouteContext<"/[site]/api/auth/verify">) {
  const { site } = await ctx.params;
  if (!isSiteKey(site)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ip = clientIp(request);
  if (!rateLimit("signin-verify:ip", ip, 10, 15 * 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "900" } });
  }

  const parsed = signInVerifyBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", message: "Enter the 6-digit code" }, { status: 400 });

  try {
    const grant = await verifySignInCode(site, parsed.data.email, parsed.data.code, {
      clientIp: ip,
      userAgent: request.headers.get("user-agent") ?? "",
      turnstileToken: null,
      idempotencyKey: crypto.randomUUID(),
    });
    const res = NextResponse.json({ session: grant.session });
    res.cookies.set(SESSION_COOKIE, grant.sessionToken, sessionCookieOptions(new Date(grant.expiresAt)));
    return res;
  } catch (e) {
    if (e instanceof PmsError && e.status === 401) {
      return NextResponse.json({ error: "invalid_code", message: "That code is invalid or has expired" }, { status: 401 });
    }
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
