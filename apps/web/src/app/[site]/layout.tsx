import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSite } from "@/lib/pms";
import { allSiteKeys } from "@/lib/sites";
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

const HEX = /^#[0-9a-f]{6}$/i;

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
      <main id="main" className="flex-1">
        {children}
      </main>
      <Suspense fallback={null}>
        <Footer params={params} />
      </Suspense>
    </div>
  );
}

async function Header({ params }: { params: SiteParams }) {
  const site = await getSite((await params).site);
  if (!site) notFound();
  // Brand colours come from the PMS (validated there); only plain hex values reach the stylesheet.
  const primary = HEX.test(site.colors.primary) ? site.colors.primary : "#3d3a3a";
  const accent = HEX.test(site.colors.accent) ? site.colors.accent : "#4e8e82";
  return (
    <>
      <style>{`:root{--brand:${primary};--accent:${accent}}`}</style>
      <SiteHeader site={site} />
    </>
  );
}

async function Footer({ params }: { params: SiteParams }) {
  const site = await getSite((await params).site);
  if (!site) return null;
  return (
    <>
      <SiteFooter site={site} />
      {site.contact.whatsapp && <ChatLauncher brandName={site.brandName} whatsapp={site.contact.whatsapp.replace(/\D/g, "")} />}
    </>
  );
}
