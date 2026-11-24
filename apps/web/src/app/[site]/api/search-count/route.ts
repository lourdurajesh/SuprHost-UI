import { NextResponse, type NextRequest } from "next/server";
import { searchListings } from "@/lib/pms";
import { clientIp, rateLimit } from "@/lib/security";
import { isSiteKey } from "@/lib/sites";
import { searchParamsSchema } from "@/lib/validation";

// How many homes a search would show, for the filters' "Show N stays" button.
export async function GET(request: NextRequest, ctx: RouteContext<"/[site]/api/search-count">) {
  const { site } = await ctx.params;
  if (!isSiteKey(site)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!rateLimit("search-count", clientIp(request), 90, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "30" } });
  }
  const query = searchParamsSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  if (query.checkIn && query.checkOut && query.checkOut <= query.checkIn) query.checkOut = undefined;
  try {
    const { hits } = await searchListings(site, query);
    return NextResponse.json({ count: hits.length }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
