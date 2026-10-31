import "server-only";
import { cookies } from "next/headers";

// Guest session cookie. Holds only the opaque token the PMS issued; the PMS stores its hash and
// is the authority on whether it is still valid. HttpOnly + SameSite=Lax + Secure (+ __Host-
// prefix over HTTPS) so scripts can't read it and other sites can't send it on POSTs.

const secure = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = secure ? "__Host-sh_session" : "sh_session";

export async function readSessionToken(): Promise<string | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value && /^[A-Za-z0-9_-]{32,128}$/.test(value) ? value : null;
}

export const sessionCookieOptions = (expires: Date) => ({
  httpOnly: true,
  secure,
  sameSite: "lax" as const,
  path: "/",
  expires,
});
