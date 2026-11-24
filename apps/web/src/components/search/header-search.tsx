"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useTransition } from "react";
import type { SearchQuery } from "@/lib/pms/types";
import { queryFromParams, toSearchString } from "@/lib/search-query";
import { setFiltersSlot } from "./filters-slot";
import { SearchBar } from "./search-bar";
import { SearchOverlay } from "./search-overlay";
import { setSearchOpen, useSearchOpen } from "./search-store";
import type { Place } from "./where-panel";

function useUrlQuery() {
  const params = useSearchParams();
  return useMemo(() => queryFromParams(params), [params]);
}

/**
 * The search bar in the site header. It reads the current search from the URL, so it says the same
 * thing on every page, and the results page puts its Filters button next to it (FiltersSlot).
 * Where it shows (not in the booking flow, not over the home page's own bar) is decided in CSS:
 * see .header-search in globals.css.
 */
export function HeaderSearch() {
  const query = useUrlQuery();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <SearchBar variant="compact" query={query} />
      <div ref={setFiltersSlot} className="filters-slot hidden shrink-0" />
    </div>
  );
}

/** Same size as the bar, while the URL is being read. */
export function HeaderSearchFallback() {
  return <div aria-hidden className="h-[3.25rem] w-full rounded-full ring-1 ring-line sm:w-80" />;
}

/** The same search bar on the home page's hero. The header shows its own once this has scrolled under it. */
export function HeroSearchBar() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const root = document.documentElement;
    const seen = new IntersectionObserver(([e]) => root.toggleAttribute("data-past-hero", !e.isIntersecting && e.boundingClientRect.top < 76), { rootMargin: "-76px 0px 0px" });
    seen.observe(el);
    return () => {
      seen.disconnect();
      root.removeAttribute("data-past-hero");
    };
  }, []);
  return (
    <div ref={box} data-hero-search className="flex">
      <SearchBar variant="hero" query={NO_QUERY} />
    </div>
  );
}
const NO_QUERY: SearchQuery = {};

/**
 * The open search panel, for whichever bar was pressed. It lives in the layout, so a search started on
 * the home page can carry its bar up into the header while the results page loads underneath.
 */
export function SearchHost({ places, timezone, brandName }: { places: Place[]; timezone: string; brandName: string }) {
  const router = useRouter();
  const query = useUrlQuery();
  const open = useSearchOpen();
  const [pending, startTransition] = useTransition();

  function apply(next: SearchQuery) {
    const url = `/stays${toSearchString(next)}`;
    startTransition(() => {
      // Refining a search shouldn't fill the history; starting one from another page should.
      if (window.location.pathname === "/stays") router.replace(url, { scroll: false });
      else router.push(url);
    });
  }

  if (!open) return null;
  return (
    <SearchOverlay
      open={open}
      query={open.variant === "hero" ? NO_QUERY : query}
      places={places}
      timezone={timezone}
      brandName={brandName}
      pending={pending}
      onApply={apply}
      onClose={(searched) => {
        const { opener, variant } = open;
        setSearchOpen(null);
        // After the bar is back on screen: a hidden control can't take focus.
        setTimeout(() => {
          const home = searched && variant === "hero" ? document.querySelector<HTMLElement>('[data-search-bar="compact"] button') : opener;
          (home?.offsetParent ? home : document.querySelector<HTMLElement>('button[data-search-bar="compact-phone"]'))?.focus({ preventScroll: true });
        }, 0);
      }}
    />
  );
}
