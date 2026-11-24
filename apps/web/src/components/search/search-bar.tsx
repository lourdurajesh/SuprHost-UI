"use client";

import { useEffect, useState } from "react";
import type { SearchQuery } from "@/lib/pms/types";
import { describeWhen, describeWho } from "@/lib/search-query";
import { Icon } from "../icons";
import { SearchOverlay, type Section } from "./search-overlay";
import type { Place } from "./where-panel";

/**
 * The compact search bar in the site header: where, when and who at a glance. Any
 * part of it opens the full search panel on that part; the page remembers nothing until "Search".
 */
export function SearchBar({
  query,
  places,
  timezone,
  brandName,
  pending,
  onApply,
}: {
  query: SearchQuery;
  places: Place[];
  timezone: string;
  brandName: string;
  pending: boolean;
  onApply: (next: SearchQuery) => void;
}) {
  const [open, setOpen] = useState<Section | null>(null);
  // The control that opened the panel, so focus can go back to it when the panel closes.
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  // The bar's place on screen when it was clicked: the big bar grows out of it and shrinks back.
  const [from, setFrom] = useState<DOMRect | null>(null);

  // Once the panel is gone and the bar is visible again: a hidden control can't take focus.
  useEffect(() => {
    if (!open) opener?.focus({ preventScroll: true });
  }, [open, opener]);

  const launch = (section: Section) => (e: React.MouseEvent<HTMLElement>) => {
    setOpener(e.currentTarget);
    setFrom(e.currentTarget.parentElement!.getBoundingClientRect());
    setOpen(section);
  };
  const seg = "focus-own min-w-0 truncate px-4 py-2.5 text-left text-sm outline-none transition hover:bg-sand-deep focus-visible:ring-2 focus-visible:ring-ink";
  const where = query.city ?? "Anywhere";
  const when = describeWhen(query, true);
  const who = describeWho(query);

  return (
    <>
      {/* Larger screens: three segments and a search button. */}
      <div className={`hidden min-w-0 items-center rounded-full bg-white py-1 pl-2 pr-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.08)] ring-1 ring-line transition hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] sm:flex ${open ? "invisible" : ""}`}>
        <button type="button" onClick={launch("where")} className={`${seg} rounded-l-full font-medium`}>
          {where}
        </button>
        <span aria-hidden className="h-6 w-px shrink-0 bg-line" />
        <button type="button" onClick={launch("when")} className={`${seg} ${query.checkIn || query.stay || query.months?.length ? "" : "text-ink-soft"}`}>
          {when}
        </button>
        <span aria-hidden className="h-6 w-px shrink-0 bg-line" />
        <button type="button" onClick={launch("who")} className={`${seg} ${query.guests ? "" : "text-ink-soft"}`}>
          {who}
        </button>
        <button type="button" onClick={launch("where")} aria-label="Search" className="focus-own ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white transition hover:brightness-125 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">
          <Icon name="search" className={`h-4 w-4 ${pending ? "animate-pulse" : ""}`} strokeWidth={2.2} />
        </button>
      </div>

      {/* Phones: one wide button with the place on top and the rest beneath. */}
      <button
        type="button"
        onClick={launch("where")}
        className="focus-own flex min-w-0 flex-1 items-center gap-3 rounded-full bg-white px-4 py-2 text-left shadow-[0_2px_10px_rgba(0,0,0,0.08)] ring-1 ring-line focus-visible:ring-2 focus-visible:ring-ink sm:hidden"
        aria-label={`Change search: ${where}, ${when}, ${who}`}
      >
        <Icon name="search" className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{where}</span>
          <span className="block truncate text-xs text-ink-soft">
            {when} · {who}
          </span>
        </span>
      </button>

      {open && (
        <SearchOverlay
          query={query}
          places={places}
          timezone={timezone}
          initial={open}
          brandName={brandName}
          from={from}
          onApply={onApply}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
