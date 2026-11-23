import { NextResponse } from "next/server";
import { getWishlist, PmsError } from "@/lib/pms";
import { readSessionToken } from "@/lib/session";
import { isSiteKey } from "@/lib/sites";

// Ids of the signed-in guest's saved stays, for the hearts on cards. Being signed out is a normal
// state here, not an error (every anonymous page view asks), so it answers 200 { signedIn: false }
// instead of a 401 that shows up as a red line in every visitor's console.
export async function GET(_request: Request, ctx: RouteContext<"/[site]/api/wishlist">) {
  const { site } = await ctx.params;
  if (!isSiteKey(site)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const session = await readSessionToken();
  const signedOut = NextResponse.json({ signedIn: false, ids: [] }, { headers: { "Cache-Control": "no-store" } });
  if (!session) return signedOut;
  try {
    const list = await getWishlist(site, session);
    return NextResponse.json({ signedIn: true, ids: list.map((l) => l.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof PmsError && e.status === 401) return signedOut;
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
