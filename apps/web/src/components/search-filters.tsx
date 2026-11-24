"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PropertyType, SearchQuery, SearchResult } from "@/lib/pms/types";
import { formatMoney } from "@/lib/dates";
import { toSearchString } from "@/lib/search-query";
import { Dropdown } from "./dropdown";
import { Icon } from "./icons";
import { FiltersModal } from "./search/filters-modal";
import { SearchBar } from "./search/search-bar";

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
  timezone: string;
  /** Every home's nightly price, for the price histogram in the filters. */
  prices: number[];
}

// Search state lives in the URL (shareable, back-button friendly). The search bar and the filters each
// apply in one go ("Search" / "Show N stays"); sort applies at once.
export function SearchFilters({ query, facets, currency, count, timezone, prices }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);

  function apply(next: SearchQuery) {
    startTransition(() => router.replace(`${pathname}${toSearchString(next)}`, { scroll: false }));
  }

  const activeFilters =
    (query.types?.length ?? 0) +
    (query.amenities?.length ?? 0) +
    (query.bedrooms ? 1 : 0) +
    (query.minPrice || query.maxPrice ? 1 : 0);

  const pill = "focus-own min-h-11 shrink-0 rounded-full bg-white px-4 py-2.5 text-sm ring-1 ring-line outline-none focus-visible:ring-2 focus-visible:ring-ink";
  const dropdown = `${pill} select-chevron [--select-inset:1rem]`;

  // Applied filters as removable chips, so guests can see and undo what narrows the list.
  const applied: { key: string; label: string; next: SearchQuery }[] = [
    ...(query.types ?? []).map((t) => ({ key: `type-${t}`, label: TYPE_LABEL[t], next: { ...query, types: query.types!.filter((x) => x !== t) } })),
    ...(query.bedrooms ? [{ key: "bedrooms", label: `${query.bedrooms}+ bedrooms`, next: { ...query, bedrooms: undefined } }] : []),
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
      {/* The compact search bar stays here at the top; Filters sits beside it. */}
      <div className="flex items-center gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr]">
        <span className="hidden sm:block" />
        <SearchBar query={query} places={facets.cities} timezone={timezone} onApply={apply} />
        <div className="flex sm:justify-end">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-label={activeFilters ? `Filters, ${activeFilters} applied` : "Filters"}
            className={`${pill} inline-flex items-center gap-2 max-sm:h-11 max-sm:w-11 max-sm:justify-center max-sm:px-0`}
          >
            <Icon name="sliders" className="h-4 w-4" />
            <span className="max-sm:hidden">Filters</span>
            {activeFilters > 0 && <span className="rounded-full bg-ink px-2 text-xs text-white max-sm:hidden">{activeFilters}</span>}
          </button>
        </div>
      </div>

      <FiltersModal open={filtersOpen} onClose={() => setFiltersOpen(false)} query={query} facets={facets} prices={prices} currency={currency} onApply={apply} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="mr-2 text-sm text-ink" aria-live="polite">
          {pending ? "Updating…" : `${count} stay${count === 1 ? "" : "s"}${query.checkIn && query.checkOut ? " available for your dates" : ""}`}
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
            onClick={() => apply({ ...query, types: undefined, bedrooms: undefined, minPrice: undefined, maxPrice: undefined, amenities: undefined })}
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
