import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSite } from "@/lib/pms";
import { FaqList } from "@/themes/escape/faq";

export const metadata: Metadata = { title: "FAQ" };

async function FaqContent({ params }: Pick<PageProps<"/[site]/faq">, "params">) {
  const site = await getSite((await params).site);
  if (!site) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <h1 className="text-h1">Questions, answered</h1>
      <p className="mt-5 text-ink-soft">Can’t find what you need? Message us and we’ll reply quickly.</p>
      {site.faqs.length > 0 && (
        <div className="mt-10">
          <FaqList items={site.faqs} />
        </div>
      )}
    </div>
  );
}

// Reads the URL inside <Suspense> so the shell renders at once and client navigations stay instant.
export default function FaqPage({ params }: PageProps<"/[site]/faq">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-6 h-96 max-w-7xl animate-pulse rounded-3xl bg-sand-deep" aria-hidden />}>
      <FaqContent params={params} />
    </Suspense>
  );
}
