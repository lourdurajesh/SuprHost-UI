import { getListings, getSite } from "@/lib/pms";
import { allSiteKeys } from "@/lib/sites";

// A route handler rather than the sitemap.ts convention, which does not receive the [site] param.

export async function generateStaticParams() {
  return allSiteKeys().map((site) => ({ site }));
}

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export async function GET(_request: Request, ctx: RouteContext<"/[site]/sitemap.xml">) {
  const key = (await ctx.params).site;
  const [site, listings] = await Promise.all([getSite(key), getListings(key)]);
  if (!site) return new Response("Not found", { status: 404 });

  const urls = [
    { loc: `${site.canonicalUrl}/`, priority: "1.0" },
    { loc: `${site.canonicalUrl}/stays`, priority: "0.9" },
    ...listings.map((l) => ({ loc: `${site.canonicalUrl}/stays/${l.slug}`, priority: "0.8" })),
    { loc: `${site.canonicalUrl}/policies`, priority: "0.3" },
  ];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${escapeXml(u.loc)}</loc><priority>${u.priority}</priority></url>`).join("\n") +
    `\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
