"use client";

import type { SearchQuery } from "@/lib/pms/types";
import { describeWhen, describeWho } from "@/lib/search-query";
import { Icon } from "../icons";
import { setSearchOpen, useSearchOpen, type SearchVariant, type Section } from "./search-store";

/** What the bar says. Anything not chosen yet is an invitation, in the softer colour. */
export function searchTexts(query: SearchQuery) {
  return {
    where: query.city ?? "Anywhere",
    when: describeWhen(query, true),
    who: describeWho(query),
    hasWhen: Boolean(query.checkIn || query.stay || query.months?.length),
    hasWho: Boolean(query.guests),
  };
}

/**
 * The bar as it looks at rest: one compact line in the header, or the larger labelled bar on the
 * hero. The search bar and the moving bar of the open panel draw this same face, so the one turns
 * into the other without a jump. Without `onPick` it is only a picture (the moving bar).
 */
export function SearchFace({
  variant,
  query,
  pending = false,
  onPick,
}: {
  variant: SearchVariant;
  query: SearchQuery;
  pending?: boolean;
  onPick?: (section: Section, e: React.MouseEvent<HTMLElement>) => void;
}) {
  const t = searchTexts(query);
  const Seg = onPick ? "button" : "span";
  const on = (s: Section) => (onPick ? { type: "button" as const, onClick: (e: React.MouseEvent<HTMLElement>) => onPick(s, e) } : {});
  const icon = <Icon name="search" className={`h-4 w-4 ${pending ? "animate-pulse" : ""}`} strokeWidth={2.2} />;
  const focus = "focus-own outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink";

  if (variant === "compact") {
    const seg = `${focus} min-w-0 truncate rounded-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-sand-deep`;
    const line = <span aria-hidden className="h-6 w-px shrink-0 bg-line" />;
    return (
      <span className="flex h-full min-w-0 items-center justify-center py-1 pl-2 pr-1.5">
        <Seg {...on("where")} className={`${seg} font-medium`}>
          {t.where}
        </Seg>
        {line}
        <Seg {...on("when")} className={`${seg} ${t.hasWhen ? "" : "text-ink-soft"}`}>
          {t.when}
        </Seg>
        {line}
        <Seg {...on("who")} className={`${seg} ${t.hasWho ? "" : "text-ink-soft"}`}>
          {t.who}
        </Seg>
        <Seg {...on("where")} aria-label="Search" className={`${focus} ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white transition hover:brightness-125`}>
          {icon}
        </Seg>
      </span>
    );
  }

  const seg = `${focus} flex h-full min-w-0 flex-col justify-center rounded-full px-7 text-left transition-colors hover:bg-sand-deep`;
  const line = <span aria-hidden className="my-4 w-px shrink-0 self-stretch bg-line" />;
  return (
    <span className="flex h-full min-w-0 items-center pr-2">
      <Seg {...on("where")} className={`${seg} flex-[1.25]`}>
        <span className="text-xs font-medium">Where</span>
        <span className={`truncate text-sm ${query.city ? "text-ink" : "text-ink-soft"}`}>{query.city ?? "Search places"}</span>
      </Seg>
      {line}
      <Seg {...on("when")} className={`${seg} flex-1`}>
        <span className="text-xs font-medium">When</span>
        <span className={`truncate text-sm ${t.hasWhen ? "text-ink" : "text-ink-soft"}`}>{t.when}</span>
      </Seg>
      {line}
      <Seg {...on("who")} className={`${seg} flex-1`}>
        <span className="text-xs font-medium">Who</span>
        <span className={`truncate text-sm ${t.hasWho ? "text-ink" : "text-ink-soft"}`}>{t.who}</span>
      </Seg>
      <Seg {...on("where")} className={`${focus} inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-brand px-6 font-medium text-white transition hover:brightness-125`}>
        {icon} Search
      </Seg>
    </span>
  );
}

/**
 * The search bar, the same one everywhere: in the header and on the home page. It only shows the
 * current search and opens the panel (SearchHost, in the layout) on the part that was pressed.
 */
export function SearchBar({ query, variant, pending = false }: { query: SearchQuery; variant: SearchVariant; pending?: boolean }) {
  const open = useSearchOpen();
  const t = searchTexts(query);
  // While the panel is open the moving bar stands in for this one.
  const away = open?.variant === variant ? "invisible" : "";

  const launch = (section: Section, e: React.MouseEvent<HTMLElement>) => {
    const bar = e.currentTarget.closest<HTMLElement>("[data-search-bar]")!;
    setSearchOpen({ variant, section, from: bar.getBoundingClientRect(), opener: e.currentTarget });
  };

  return (
    <>
      {/* Larger screens: three segments and a search button. */}
      <div
        data-search-bar={variant}
        className={`hidden min-w-0 rounded-full bg-white text-ink ring-1 ring-line transition-shadow sm:block ${
          variant === "hero"
            ? "h-[66px] w-full max-w-3xl shadow-[0_18px_50px_-15px_rgba(0,0,0,0.45)]"
            : "shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
        } ${away}`}
      >
        <SearchFace variant={variant} query={query} pending={pending} onPick={launch} />
      </div>

      {/* Phones: one wide button with the place on top and the rest beneath. */}
      <button
        type="button"
        data-search-bar={`${variant}-phone`}
        onClick={(e) => launch("where", e)}
        className={`focus-own flex min-w-0 flex-1 items-center gap-3 rounded-full bg-white px-4 py-2 text-left text-ink shadow-[0_2px_10px_rgba(0,0,0,0.08)] ring-1 ring-line focus-visible:ring-2 focus-visible:ring-ink sm:hidden ${variant === "hero" ? "w-full py-3" : ""}`}
        aria-label={`Search stays: ${t.where}, ${t.when}, ${t.who}`}
      >
        <Icon name="search" className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{variant === "hero" && !query.city ? "Where to?" : t.where}</span>
          <span className="block truncate text-xs text-ink-soft">
            {t.when} · {t.who}
          </span>
        </span>
      </button>
    </>
  );
}
