import { NextResponse } from "next/server";
import { getWishlist, PmsError } from "@/lib/pms";
import { readSessionToken } from "@/lib/session";
import { isSiteKey } from "@/lib/sites";

// Ids of the signed-in guest's saved stays, for the hearts on cards. 401 when signed out.
export async function GET(_request: Request, ctx: RouteContext<"/[site]/api/wishlist">) {
  const { site } = await ctx.params;
  if (!isSiteKey(site)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const session = await readSessionToken();
  if (!session) return NextResponse.json({ error: "sign_in_required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const list = await getWishlist(site, session);
    return NextResponse.json({ ids: list.map((l) => l.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof PmsError && e.status === 401) return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
