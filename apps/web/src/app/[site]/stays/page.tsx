import type { Metadata } from "next";
import { RecentlyViewed } from "@/components/recently-viewed";
import { Suspense } from "react";
import { connection } from "next/server";
import { SearchFilters } from "@/components/search-filters";
import { SearchResults } from "@/components/search-results";
import { getListings, getSite, searchListings, type SearchQuery } from "@/lib/pms";
import { GroupSuggestions } from "@/components/group-suggestions";
import { groupSuggestions } from "@/lib/group-stays";
import { searchParamsSchema } from "@/lib/validation";

export const metadata: Metadata = {
  title: "All stays",
  description: "Browse every home, filter by dates, guests, price and amenities, and see them on the map.",
  alternates: { canonical: "/stays" },
};

export default function StaysPage({ params, searchParams }: PageProps<"/[site]/stays">) {
  return (
    // data-stays-page: on phones the header shows its search bar here (globals.css).
    <div data-stays-page className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
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
  // A party bigger than any one home finds no results: offer homes that sleep them together.
  const allListings = await getListings(key);
  const prices = allListings.map((l) => l.fromPrice);
  const groups = query.guests && result.hits.length === 0 ? groupSuggestions(allListings, query.guests) : [];

  return (
    <>
      <div className="mt-4">
        <SearchFilters key={JSON.stringify(query)} query={query} facets={result.facets} currency={site.currency} count={result.hits.length} prices={prices} />
      </div>
      <div className="mt-6">
        <RecentlyViewed currency={site.currency} offered={allListings.map((l) => l.slug)} />
        {query.guests && groups.length > 0 && (
          <GroupSuggestions suggestions={groups} guests={query.guests} checkIn={query.checkIn} checkOut={query.checkOut} currency={site.currency} />
        )}
        <SearchResults hits={result.hits} query={query} currency={site.currency} addsGst={site.pricesAddGst} />
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
