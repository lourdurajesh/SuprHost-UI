import { NextResponse, type NextRequest } from "next/server";
import { endGuestSession } from "@/lib/pms";
import { isSameOrigin } from "@/lib/security";
import { readSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { isSiteKey } from "@/lib/sites";

export async function POST(request: NextRequest, ctx: RouteContext<"/[site]/api/auth/logout">) {
  const { site } = await ctx.params;
  if (!isSiteKey(site)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const token = await readSessionToken();
  if (token) await endGuestSession(site, token).catch(() => undefined);
  const res = NextResponse.json({ status: "signed_out" });
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(new Date(0)));
  return res;
}
