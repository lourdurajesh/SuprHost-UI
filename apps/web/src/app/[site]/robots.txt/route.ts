import { getSite } from "@/lib/pms";
import { allSiteKeys } from "@/lib/sites";

export async function generateStaticParams() {
  return allSiteKeys().map((site) => ({ site }));
}

export async function GET(_request: Request, ctx: RouteContext<"/[site]/robots.txt">) {
  const site = await getSite((await ctx.params).site);
  const body = site
    ? `User-agent: *\nAllow: /\nDisallow: /book\nDisallow: /api/\n\nSitemap: ${site.canonicalUrl}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
