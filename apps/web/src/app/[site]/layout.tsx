import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
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

export default async function SiteLayout({ children, params }: LayoutProps<"/[site]">) {
  const site = await getSite((await params).site);
  if (!site) notFound();

  const brand = { "--brand": site.colors.primary, "--accent": site.colors.accent } as CSSProperties;
  return (
    <div style={brand} className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <SiteHeader site={site} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter site={site} />
      {site.contact.whatsapp && <ChatLauncher brandName={site.brandName} whatsapp={site.contact.whatsapp.replace(/\D/g, "")} />}
    </div>
  );
}
