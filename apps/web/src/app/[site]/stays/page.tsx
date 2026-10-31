import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { SearchFilters } from "@/components/search-filters";
import { SearchResults } from "@/components/search-results";
import { getSite, searchListings, type SearchQuery } from "@/lib/pms";
import { searchParamsSchema } from "@/lib/validation";

export const metadata: Metadata = {
  title: "All stays",
  description: "Browse every home, filter by dates, guests, price and amenities, and see them on the map.",
  alternates: { canonical: "/stays" },
};

export default function StaysPage({ params, searchParams }: PageProps<"/[site]/stays">) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <h1 className="text-h1">All stays</h1>
      <Suspense fallback={<ResultsSkeleton />}>
        <StaysContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function StaysContent({ params, searchParams }: Pick<PageProps<"/[site]/stays">, "params" | "searchParams">) {
  // Search results depend on today's availability: always render at request time.
  await connection();
  const { site: key } = await params;
  const query: SearchQuery = searchParamsSchema.parse(await searchParams);
  if (query.checkIn && query.checkOut && query.checkOut <= query.checkIn) query.checkOut = undefined;
  const [site, result] = await Promise.all([getSite(key), searchListings(key, query)]);
  if (!site) return null;

  return (
    <>
      <div className="sticky top-[76px] z-30 -mx-4 mt-4 border-b border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <SearchFilters key={JSON.stringify(query)} query={query} facets={result.facets} currency={site.currency} count={result.hits.length} />
      </div>
      <div className="mt-6">
        <SearchResults hits={result.hits} query={query} currency={site.currency} />
      </div>
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_minmax(0,0.85fr)]">
      <div className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-sand-deep" />
        ))}
      </div>
      <div className="hidden h-[70svh] animate-pulse rounded-2xl bg-sand-deep lg:block" />
    </div>
  );
}
