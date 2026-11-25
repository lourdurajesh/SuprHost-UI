import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/links";
import { clientIp, isSameOrigin, rateLimit } from "@/lib/security";

// A test site is for the team only: with SITE_ACCESS_CODE set, every page and API route needs a
// cookie that the access page hands out for the code, and search engines are told to stay away.
// Live sites don't set it, and then none of this runs.

const CODE = process.env.SITE_ACCESS_CODE?.trim() ?? "";
const COOKIE = "site_access";
const PATH = "/access";
const DAYS_30 = 30 * 86_400;

export const isTestSite = CODE.length > 0;

if (isTestSite && CODE.length < 10) throw new Error("SITE_ACCESS_CODE must be at least 10 characters.");

const digest = (text: string) => createHash("sha256").update(text).digest();
const pass = () => createHmac("sha256", CODE).update("site-access-v1").digest("base64url");

const matches = (given: string, expected: string) => timingSafeEqual(digest(given), digest(expected));

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function page(next: string, error: string | null, status: number) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Test site</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.5 system-ui,sans-serif;color:#222;background:#f6f5f3}main{width:min(22rem,calc(100vw - 2rem));background:#fff;padding:2rem;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);box-sizing:border-box}h1{font-size:1.25rem;margin:0 0 .5rem}p{margin:0 0 1rem}label{display:block;font-weight:600;margin-bottom:.25rem}input{width:100%;box-sizing:border-box;font:inherit;padding:.65rem .75rem;border:1px solid #767676;border-radius:8px}button{margin-top:1rem;width:100%;font:inherit;font-weight:600;padding:.7rem;border:0;border-radius:8px;background:#222;color:#fff;cursor:pointer}:focus-visible{outline:2px solid #222;outline-offset:2px}.e{color:#b00020}</style></head>
<body><main><h1>This is a test site</h1><p>Enter the access code your team gave you.</p><form method="post" action="${PATH}"><input type="hidden" name="next" value="${escapeHtml(next)}"><label for="code">Access code</label><input id="code" name="code" type="password" autocomplete="off" required autofocus${error ? ' aria-invalid="true" aria-describedby="error"' : ""}>${error ? `<p class="e" id="error" role="alert" style="margin:.5rem 0 0">${error}</p>` : ""}<button>Continue</button></form></main></body></html>`;
  return new NextResponse(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    },
  });
}

/** The answer for someone who may not see the test site yet, or null when they may. */
export async function accessGate(request: NextRequest): Promise<NextResponse | null> {
  if (!isTestSite) return null;
  const { pathname, search } = request.nextUrl;

  if (pathname === "/robots.txt") {
    return new NextResponse("User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  // Signed by the PMS itself, which has no cookie.
  if (pathname === "/api/revalidate" && request.method === "POST") return null;

  if (pathname === PATH) {
    if (request.method !== "POST") return page(safeNext(request.nextUrl.searchParams.get("next")), null, 200);
    const form = await request.formData().catch(() => null);
    const next = safeNext(String(form?.get("next") ?? ""));
    if (!isSameOrigin(request)) return page(next, "Open this page again and retry.", 403);
    if (!rateLimit("access:ip", clientIp(request), 10, 10 * 60_000)) return page(next, "Too many tries. Wait ten minutes.", 429);
    if (!matches(String(form?.get("code") ?? "").trim(), CODE)) return page(next, "That code isn\u2019t right.", 401);

    const https = (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol).startsWith("https");
    // A proxy's redirect needs a full address; the host has been checked against the configured sites.
    const response = NextResponse.redirect(new URL(next, `${https ? "https" : "http"}://${request.headers.get("host")}`), 303);
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(COOKIE, pass(), { httpOnly: true, secure: https, sameSite: "lax", path: "/", maxAge: DAYS_30 });
    return response;
  }

  const given = request.cookies.get(COOKIE)?.value;
  if (given && matches(given, pass())) return null;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ code: "access_required", message: "Open the site and enter the access code." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return page(safeNext(pathname + search), null, 401);
}
