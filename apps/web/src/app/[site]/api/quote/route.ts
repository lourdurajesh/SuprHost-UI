import { NextResponse, type NextRequest } from "next/server";
import { getQuote, PmsError } from "@/lib/pms";
import { clientIp, rateLimit } from "@/lib/security";
import { isSiteKey } from "@/lib/sites";
import { stayQuery } from "@/lib/validation";

export async function GET(request: NextRequest, ctx: RouteContext<"/[site]/api/quote">) {
  const { site } = await ctx.params;
  if (!isSiteKey(site)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!rateLimit("quote", clientIp(request), 60, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const parsed = stayQuery.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", message: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const { listing, checkIn, checkOut, guests } = parsed.data;
    return NextResponse.json(await getQuote(site, listing, checkIn, checkOut, guests));
  } catch (e) {
    if (e instanceof PmsError && e.status < 500) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
