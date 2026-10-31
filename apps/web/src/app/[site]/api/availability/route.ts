import { NextResponse, type NextRequest } from "next/server";
import { getAvailability, PmsError } from "@/lib/pms";
import { clientIp, rateLimit } from "@/lib/security";
import { isSiteKey } from "@/lib/sites";
import { availabilityQuery } from "@/lib/validation";

export async function GET(request: NextRequest, ctx: RouteContext<"/[site]/api/availability">) {
  const { site } = await ctx.params;
  if (!isSiteKey(site)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!rateLimit("availability", clientIp(request), 60, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const parsed = availabilityQuery.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  try {
    const { listing, from, to } = parsed.data;
    return NextResponse.json(await getAvailability(site, listing, from, to));
  } catch (e) {
    const status = e instanceof PmsError && e.status < 500 ? e.status : 502;
    return NextResponse.json({ error: "unavailable" }, { status });
  }
}
