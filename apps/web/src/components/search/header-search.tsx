"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import type { SearchQuery } from "@/lib/pms/types";
import { queryFromParams, toSearchString } from "@/lib/search-query";
import { setFiltersSlot } from "./filters-slot";
import { SearchBar } from "./search-bar";
import type { Place } from "./where-panel";

/**
 * The search bar in the site header. It reads the current search from the URL, so it says the same
 * thing on every page, and the results page puts its Filters button next to it (FiltersSlot).
 * Where it shows (not in the booking flow, not over the home page's own search) is decided in CSS:
 * see .header-search in globals.css.
 */
export function HeaderSearch({ places, timezone, brandName }: { places: Place[]; timezone: string; brandName: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const query = useMemo(() => queryFromParams(params), [params]);
  const [pending, startTransition] = useTransition();

  function apply(next: SearchQuery) {
    const url = `/stays${toSearchString(next)}`;
    startTransition(() => {
      // Refining a search shouldn't fill the history; starting one from another page should.
      if (window.location.pathname === "/stays") router.replace(url, { scroll: false });
      else router.push(url);
    });
  }

  return (
    <div className="flex min-w-0 items-center gap-3" aria-busy={pending}>
      <SearchBar query={query} places={places} timezone={timezone} brandName={brandName} pending={pending} onApply={apply} />
      <div ref={setFiltersSlot} className="filters-slot hidden shrink-0" />
    </div>
  );
}

/** Same size as the bar, while the URL is being read. */
export function HeaderSearchFallback() {
  return <div aria-hidden className="h-[3.25rem] w-full rounded-full ring-1 ring-line sm:w-80" />;
}
