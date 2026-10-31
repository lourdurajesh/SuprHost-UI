import { NextResponse, type NextRequest } from "next/server";
import { siteKeyForHost } from "@/lib/sites";

// Resolves the tenant from the Host header and rewrites to the internal /[site] segment.
// Every path is prefixed, so a visitor can never address another tenant's pages or API routes
// by typing its key into the URL; an unknown host gets a bare 404.

export function proxy(request: NextRequest) {
  const key = siteKeyForHost(request.headers.get("host"));
  if (!key) {
    return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${key}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
}

// Static files from /public (images, fonts) are shared by all sites and skip the rewrite.
// robots.txt and sitemap.xml are per-site routes, so they still go through it.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)"],
};
