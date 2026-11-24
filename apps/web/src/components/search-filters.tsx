"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type { PropertyType, SearchQuery, SearchResult } from "@/lib/pms/types";
import { formatMoney } from "@/lib/dates";
import { toSearchString } from "@/lib/search-query";
import { Dropdown } from "./dropdown";
import { Icon } from "./icons";
import { FiltersModal } from "./search/filters-modal";
import { useFiltersSlot } from "./search/filters-slot";

const TYPE_LABEL: Record<PropertyType, string> = {
  cottage: "Cottages",
  suite: "Suites",
  villa: "Villas",
  home: "Homes",
  apartment: "Apartments",
};

export { toSearchString };

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
    (query.instantBook ? 1 : 0) +
    (query.minPrice || query.maxPrice ? 1 : 0);

  const pill = "focus-own min-h-11 shrink-0 rounded-full bg-white px-4 py-2.5 text-sm ring-1 ring-line outline-none focus-visible:ring-2 focus-visible:ring-ink";
  const dropdown = `${pill} select-chevron [--select-inset:1rem]`;

  // Applied filters as removable chips, so guests can see and undo what narrows the list.
  const applied: { key: string; label: string; next: SearchQuery }[] = [
    ...(query.types ?? []).map((t) => ({ key: `type-${t}`, label: TYPE_LABEL[t], next: { ...query, types: query.types!.filter((x) => x !== t) } })),
    ...(query.bedrooms ? [{ key: "bedrooms", label: `${query.bedrooms}+ bedrooms`, next: { ...query, bedrooms: undefined } }] : []),
    ...(query.beds ? [{ key: "beds", label: `${query.beds}+ beds`, next: { ...query, beds: undefined } }] : []),
    ...(query.bathrooms ? [{ key: "bathrooms", label: `${query.bathrooms}+ bathrooms`, next: { ...query, bathrooms: undefined } }] : []),
    ...(query.instantBook ? [{ key: "instant", label: "Instant Book", next: { ...query, instantBook: undefined } }] : []),
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
            className={`${pill} relative inline-flex h-12 items-center gap-2 max-lg:w-12 max-lg:justify-center max-lg:px-0`}
          >
            <Icon name="sliders" className="h-4 w-4" />
            <span className="max-lg:hidden">Filters</span>
            {activeFilters > 0 && (
              <span className="rounded-full bg-ink px-2 text-xs text-white max-lg:absolute max-lg:-right-1 max-lg:-top-1 max-lg:px-1.5 max-lg:py-0.5">{activeFilters}</span>
            )}
          </button>,
          slot,
        )}

      <FiltersModal open={filtersOpen} onClose={() => setFiltersOpen(false)} query={query} facets={facets} prices={prices} currency={currency} onApply={apply} />

      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-2 text-sm text-ink" aria-live="polite">
          {pending ? "Updating…" : `${count} stay${count === 1 ? "" : "s"}${query.checkIn && query.checkOut ? " available for your dates" : query.stay || query.months?.length ? ` free for a ${query.stay ?? "weekend"}` : ""}`}
        </p>
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
            onClick={() => apply({ ...query, types: undefined, bedrooms: undefined, beds: undefined, bathrooms: undefined, instantBook: undefined, minPrice: undefined, maxPrice: undefined, amenities: undefined })}
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
          className={`${dropdown} ml-auto`}
        />
      </div>
    </div>
  );
}
