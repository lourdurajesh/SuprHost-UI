import { NextResponse } from "next/server";
import { getGuestSession } from "@/lib/pms";
import { readSessionToken } from "@/lib/session";
import { isSiteKey } from "@/lib/sites";

// Read by the header's account menu after the page loads, so cached pages stay identical for
// everyone and never contain a guest's details.
export async function GET(_request: Request, ctx: RouteContext<"/[site]/api/auth/session">) {
  const { site } = await ctx.params;
  if (!isSiteKey(site)) return NextResponse.json({ session: null }, { status: 404 });
  const token = await readSessionToken();
  const session = token ? await getGuestSession(site, token).catch(() => null) : null;
  return NextResponse.json({ session }, { headers: { "Cache-Control": "private, no-store" } });
}
