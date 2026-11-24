import { stayUrl } from "@/lib/links";
import { getListings } from "@/lib/pms";
import { parseShort, shortCode } from "@/lib/short-link";
import { isSiteKey } from "@/lib/sites";

// A shared short link. Sends the visitor (and link previews, which follow redirects) to the home;
// one that no longer exists goes to the list of stays instead of a dead end.
export async function GET(_request: Request, ctx: RouteContext<"/[site]/s/[code]">) {
  const { site, code } = await ctx.params;
  const short = isSiteKey(site) ? parseShort(code) : null;
  const home = short && (await getListings(site)).find((l) => shortCode(l.id) === short.code);

  const path = home && short ? stayUrl(home.slug, short.stay) : "/stays";
  // A path, not a full address: behind a proxy the request's own host may be an internal one.
  return new Response(null, { status: 307, headers: { Location: path, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
