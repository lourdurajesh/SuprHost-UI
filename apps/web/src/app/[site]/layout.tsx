import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getListings, getSite } from "@/lib/pms";
import { allSiteKeys } from "@/lib/sites";
import { paletteCss, sitePalette } from "@/lib/palettes";
import { ChatLauncher } from "@/components/chat-launcher";
import { SiteFooter, SiteHeader } from "@/themes/escape/chrome";

// Every configured site is prerendered at build time; the proxy only ever rewrites to these keys.
export async function generateStaticParams() {
  return allSiteKeys().map((site) => ({ site }));
}

export async function generateMetadata({ params }: LayoutProps<"/[site]">): Promise<Metadata> {
  const site = await getSite((await params).site);
  if (!site) return {};
  return {
    metadataBase: new URL(site.canonicalUrl),
    title: { default: site.seo.title, template: `%s · ${site.brandName}` },
    description: site.seo.description,
    applicationName: site.brandName,
    openGraph: { type: "website", siteName: site.brandName, title: site.seo.title, description: site.seo.description },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}

type SiteParams = LayoutProps<"/[site]">["params"];

// The layout never awaits the URL itself: each part that needs the site reads it inside its own
// <Suspense>, so the page body renders without waiting and client navigations stay instant.
export default function SiteLayout({ children, params }: LayoutProps<"/[site]">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Suspense fallback={<div className="h-[76px]" aria-hidden />}>
        <Header params={params} />
      </Suspense>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Suspense fallback={null}>
        <Footer params={params} />
      </Suspense>
    </div>
  );
}

async function Header({ params }: { params: SiteParams }) {
  const key = (await params).site;
  const [site, listings] = await Promise.all([getSite(key), getListings(key)]);
  if (!site) notFound();
  const places = [...new Set(listings.map((l) => l.city))].sort().map((value) => ({ value, count: listings.filter((l) => l.city === value).length }));
  // The locked palette, else one made from the PMS's colours (see lib/palettes).
  const palette = sitePalette(key, site.colors);
  return (
    <>
      <style>{paletteCss(palette)}</style>
      <SiteHeader site={site} places={places} />
    </>
  );
}

async function Footer({ params }: { params: SiteParams }) {
  const site = await getSite((await params).site);
  if (!site) return null;
  return (
    <>
      <SiteFooter site={site} />
      {site.contact.whatsapp && <ChatLauncher brandName={site.brandName} whatsapp={site.contact.whatsapp} />}
    </>
  );
}
