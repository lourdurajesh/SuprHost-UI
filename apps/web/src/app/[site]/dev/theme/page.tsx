import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSite } from "@/lib/pms";
import { lockedPalette } from "@/lib/palettes";

export const metadata: Metadata = { title: "Theme", robots: { index: false, follow: false } };

// Internal: choose this site's palette while developing. A 404 in production, where its code isn't built.
// Hosts set their two brand colours in the PMS (Website settings); a locked palette wins over those.
export default function ThemePage({ params }: PageProps<"/[site]/dev/theme">) {
  return (
    <Suspense fallback={null}>
      <Theme params={params} />
    </Suspense>
  );
}

async function Theme({ params }: Pick<PageProps<"/[site]/dev/theme">, "params">) {
  // The import sits inside the check, so the bundler drops it from production builds.
  if (process.env.NODE_ENV === "development") {
    const { site: key } = await params;
    const site = await getSite(key);
    if (site) {
      const { PaletteLab } = await import("@/components/dev/palette-lab");
      return <PaletteLab siteName={site.brandName} locked={lockedPalette(key)?.id ?? null} />;
    }
  }
  notFound();
}
