import { NextResponse, type NextRequest } from "next/server";
import { getListing } from "@/lib/pms";
import { clientIp, rateLimit } from "@/lib/security";
import { isSiteKey } from "@/lib/sites";

// All published reviews of a home, for the reviews popup. The page itself carries only the first few.
export async function GET(request: NextRequest, ctx: RouteContext<"/[site]/api/reviews">) {
  const { site } = await ctx.params;
  if (!isSiteKey(site)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!rateLimit("reviews", clientIp(request), 60, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "30" } });
  }
  const slug = request.nextUrl.searchParams.get("listing") ?? "";
  const listing = /^[a-z0-9-]{1,80}$/.test(slug) ? await getListing(site, slug) : null;
  if (!listing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ reviews: listing.reviews ?? [] }, { headers: { "Cache-Control": "public, max-age=300" } });
}
