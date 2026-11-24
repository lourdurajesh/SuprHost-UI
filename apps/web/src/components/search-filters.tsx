"use client";

import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type { SearchQuery, SearchResult } from "@/lib/pms/types";
import { formatMoney } from "@/lib/dates";
import { toSearchString } from "@/lib/search-query";
import { PROPERTY_TYPE } from "@/lib/listing-facts";
import { plural } from "@/lib/text";
import { Dropdown } from "./dropdown";
import { Icon } from "./icons";
import { useFiltersSlot } from "./search/filters-slot";
import { pillClass } from "./ui/button";
import { Dialog, DialogHeader } from "./ui/dialog";

// ssr: false gives it its own Suspense boundary; without one, the first opening blanks the whole page.
const FiltersPanel = dynamic(() => import("./search/filters-panel").then((m) => m.FiltersPanel), { ssr: false });

interface Props {
  query: SearchQuery;
  facets: SearchResult["facets"];
  currency: string;
  count: number;
  /** Every home's nightly price, for the price histogram in the filters. */
  prices: number[];
}

// Search state lives in the URL (shareable, back-button friendly). The search bar is in the site header;
// this puts the Filters button beside it, and keeps the count, applied filters and sort with the results.
export function SearchFilters({ query, facets, currency, count, prices }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const slot = useFiltersSlot();

  function apply(next: SearchQuery) {
    startTransition(() => router.replace(`${pathname}${toSearchString(next)}`, { scroll: false }));
  }

  const activeFilters =
    (query.types?.length ?? 0) +
    (query.amenities?.length ?? 0) +
    (query.bedrooms ? 1 : 0) +
    (query.beds ? 1 : 0) +
    (query.bathrooms ? 1 : 0) +
    (query.minPrice || query.maxPrice ? 1 : 0);

  // Applied filters as removable chips, so guests can see and undo what narrows the list.
  const applied: { key: string; label: string; next: SearchQuery }[] = [
    ...(query.types ?? []).map((t) => ({ key: `type-${t}`, label: `${PROPERTY_TYPE[t]}s`, next: { ...query, types: query.types!.filter((x) => x !== t) } })),
    ...(query.bedrooms ? [{ key: "bedrooms", label: `${query.bedrooms}+ bedrooms`, next: { ...query, bedrooms: undefined } }] : []),
    ...(query.beds ? [{ key: "beds", label: `${query.beds}+ beds`, next: { ...query, beds: undefined } }] : []),
    ...(query.bathrooms ? [{ key: "bathrooms", label: `${query.bathrooms}+ bathrooms`, next: { ...query, bathrooms: undefined } }] : []),
    ...(query.minPrice || query.maxPrice
      ? [
          {
            key: "price",
            label:
              query.minPrice && query.maxPrice
                ? `${formatMoney(query.minPrice, currency)} – ${formatMoney(query.maxPrice, currency)} / night`
                : query.minPrice
                  ? `From ${formatMoney(query.minPrice, currency)} / night`
                  : `Up to ${formatMoney(query.maxPrice!, currency)} / night`,
            next: { ...query, minPrice: undefined, maxPrice: undefined },
          },
        ]
      : []),
    ...(query.amenities ?? []).map((a) => ({ key: `amenity-${a}`, label: a, next: { ...query, amenities: query.amenities!.filter((x) => x !== a) } })),
  ];

  return (
    <div aria-busy={pending}>
      {slot &&
        createPortal(
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-label={activeFilters ? `Filters, ${activeFilters} applied` : "Filters"}
            className={`${pillClass} relative inline-flex h-12 items-center gap-2 max-lg:w-12 max-lg:justify-center max-lg:px-0`}
          >
            <Icon name="sliders" className="h-4 w-4" />
            <span className="max-lg:hidden">Filters</span>
            {activeFilters > 0 && (
              <span className="rounded-full bg-ink px-2 text-xs text-white max-lg:absolute max-lg:-right-1 max-lg:-top-1 max-lg:px-1.5 max-lg:py-0.5">{activeFilters}</span>
            )}
          </button>,
          slot,
        )}

      <Dialog open={filtersOpen} onClose={() => setFiltersOpen(false)} size="lg" phone="full">
        <DialogHeader title="Filters" />
        <FiltersPanel onClose={() => setFiltersOpen(false)} query={query} facets={facets} prices={prices} currency={currency} onApply={apply} />
      </Dialog>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 min-w-0 text-lg leading-tight max-sm:flex-1">
          <span aria-live="polite">
            {pending
              ? "Updating…"
              : `${plural(count, "stay")}${query.city ? ` in ${query.city}` : ""}${query.checkIn && query.checkOut ? " for your dates" : query.stay || query.months?.length ? ` free for a ${query.stay ?? "weekend"}` : ""}`}
          </span>
        </h1>
        {applied.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => apply(f.next)}
            aria-label={`Remove filter: ${f.label}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-sand-deep py-1.5 pl-3.5 pr-2.5 text-sm text-ink transition hover:bg-line"
          >
            {f.label} <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        ))}
        {applied.length > 1 && (
          <button
            type="button"
            onClick={() => apply({ ...query, types: undefined, bedrooms: undefined, beds: undefined, bathrooms: undefined, minPrice: undefined, maxPrice: undefined, amenities: undefined })}
            className="min-h-9 px-1 text-sm underline underline-offset-4"
          >
            Clear filters
          </button>
        )}
        <Dropdown
          aria-label="Sort"
          value={query.sort ?? "recommended"}
          onChange={(v) => apply({ ...query, sort: v as SearchQuery["sort"] })}
          options={[
            { value: "recommended", label: "Recommended" },
            { value: "price_asc", label: "Price: low to high" },
            { value: "price_desc", label: "Price: high to low" },
          ]}
          className={`${pillClass} ml-auto`}
        />
      </div>
    </div>
  );
}
