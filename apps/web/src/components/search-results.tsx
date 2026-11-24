"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { SearchHit, SearchQuery } from "@/lib/pms/types";
import { formatDate, formatMoney } from "@/lib/dates";
import { ListingPhoto } from "@/themes/escape/listing-media";
import { listingFacts, NightlyPrice } from "@/themes/escape/listing-card";
import { Icon } from "./icons";
import { StaysMap } from "./stays-map";
import { Rating } from "./rating";
import { WishlistButton } from "./wishlist";
import { toSearchString } from "./search-filters";

interface Props {
  hits: SearchHit[];
  query: SearchQuery;
  currency: string;
  /** Per-night prices are before GST; trip totals already include it. */
  addsGst?: boolean;
}

function compactPrice(amount: number) {
  return amount >= 1000 ? `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k` : `₹${amount}`;
}

// List + map, Airbnb-style: hovering a card highlights its pin and vice versa. On phones the map
// is a full-screen toggle so the list stays fast to scroll.
export function SearchResults({ hits, query, currency, addsGst }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [active, setActive] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  // "Search as I move the map": on while the URL carries an area, and the guest's choice otherwise.
  const [followMap, setFollowMap] = useState(Boolean(query.bounds));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialBounds = query.bounds ? (query.bounds.split(",").map(Number) as [number, number, number, number]) : null;

  // Dates carried to a stay page: a shifted match carries its own dates.
  const carryFor = (h?: SearchHit) => {
    const checkIn = h?.altCheckIn ?? query.checkIn;
    const checkOut = h?.altCheckOut ?? query.checkOut;
    const s = new URLSearchParams(
      Object.entries({ checkIn, checkOut, guests: query.guests })
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return s ? `?${s}` : "";
  };

  function onMapMove(b: [number, number, number, number]) {
    if (!followMap) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => startTransition(() => router.replace(`${pathname}${toSearchString({ ...query, bounds: b.join(",") })}`, { scroll: false })),
      400,
    );
  }

  function toggleFollow(on: boolean) {
    setFollowMap(on);
    if (!on && query.bounds) startTransition(() => router.replace(`${pathname}${toSearchString({ ...query, bounds: undefined })}`, { scroll: false }));
  }

  const pins = hits
    .filter((h) => h.location)
    .map((h) => ({
      id: h.id,
      lat: h.location!.lat,
      lng: h.location!.lng,
      // Same figure the card shows: the trip total once dates are chosen, else the nightly price.
      label: compactPrice(h.total && h.nights ? h.total : h.fromPrice),
      href: `/stays/${h.slug}${carryFor(h)}`,
      title: h.name,
    }));

  if (hits.length === 0 && query.bounds) {
    return (
      <div className="rounded-3xl bg-sand-deep p-10 text-center">
        <p className="text-xl">No stays in this part of the map.</p>
        <p className="mt-2 text-ink-soft">Zoom out or search the whole area.</p>
        <Link href={`${pathname}${toSearchString({ ...query, bounds: undefined })}`} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-brand px-6 text-white">
          Search everywhere
        </Link>
      </div>
    );
  }

  if (hits.length === 0) {
    return (
      <div className="rounded-3xl bg-sand-deep p-10 text-center">
        <p className="text-xl">No stays match these filters.</p>
        <p className="mt-2 text-ink-soft">Try different dates, fewer filters, or message us — we may be able to help.</p>
        <Link href="/stays" className="mt-6 inline-flex rounded-full bg-brand px-6 py-3 text-white">
          Clear search
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,0.85fr)]">
      <ul className={`grid gap-x-6 gap-y-10 sm:grid-cols-2 ${showMap ? "hidden lg:grid" : ""}`}>
        {hits.map((h) => (
          <li key={h.id} className="relative" onMouseEnter={() => setActive(h.id)} onMouseLeave={() => setActive(null)}>
            <WishlistButton listingId={h.id} name={h.name} className="absolute right-3 top-3 z-10" />
            <Link href={`/stays/${h.slug}${carryFor(h)}`} className="group block">
              <div className="relative">
                <ListingPhoto
                  image={h.image}
                  name={h.name}
                  sizes="(min-width: 1024px) 28vw, (min-width: 640px) 50vw, 100vw"
                  className={`aspect-[4/3] rounded-2xl ring-2 transition ${active === h.id ? "ring-ink" : "ring-transparent"}`}
                  imgClassName="transition-transform duration-700 group-hover:scale-[1.04]"
                />
                {h.instantBook && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs shadow-sm">
                    <Icon name="bolt" className="h-3.5 w-3.5" /> Instant book
                  </span>
                )}
              </div>
              <p className="mt-3 flex items-center justify-between gap-3 text-sm text-ink-soft">
                <span>
                  {h.city} · {h.propertyName}
                </span>
                <Rating rating={h.rating} className="shrink-0 text-ink" />
              </p>
              <h3 className="mt-0.5 text-xl tracking-tight group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                {h.name}
              </h3>
              {h.tagline && <p className="mt-0.5 line-clamp-2 text-ink">{h.tagline}</p>}
              <p className="mt-0.5 text-sm text-ink-soft">{listingFacts(h)}</p>
              {h.altCheckIn && h.altCheckOut && (
                <p className="mt-1 text-sm font-medium text-accent">
                  Available {formatDate(h.altCheckIn, { day: "numeric", month: "short" })} – {formatDate(h.altCheckOut, { day: "numeric", month: "short" })}
                </p>
              )}
              {h.total && h.nights ? (
                <p className="mt-2 text-base">
                  <span className="font-medium">{formatMoney(h.total, currency)}</span>
                  <span className="text-ink-soft">
                    {" "}
                    for {h.nights} night{h.nights === 1 ? "" : "s"}
                  </span>
                  <span className="block text-sm text-ink-soft">
                    {formatMoney(Math.round(h.total / h.nights), currency)} / night avg{addsGst ? " · incl. GST and fees" : " · incl. fees"}
                  </span>
                </p>
              ) : (
                <NightlyPrice amount={h.fromPrice} currency={currency} addsGst={addsGst} />
              )}
            </Link>
          </li>
        ))}
      </ul>

      {/* Sticky on the wrapper: MapLibre forces position:relative on its own container. */}
      <div className={`${showMap ? "block" : "hidden"} lg:block`}>
        <div className="lg:sticky lg:top-[100px]">
          <label className="mb-3 flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={followMap} onChange={(e) => toggleFollow(e.target.checked)} className="h-5 w-5 accent-[var(--brand)]" />
            Search as I move the map
          </label>
          <StaysMap
            key={hits.map((h) => h.id).join(",")}
            pins={pins}
            activeId={active}
            onPinHover={setActive}
            initialBounds={initialBounds}
            onMoveEnd={onMapMove}
            className="h-[70svh] rounded-3xl lg:h-[calc(100svh-244px)]"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowMap((v) => !v)}
        className="fixed bottom-6 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-white shadow-xl lg:hidden"
      >
        <Icon name={showMap ? "grid" : "pin"} className="h-4 w-4" /> {showMap ? "Show list" : "Show map"}
      </button>
    </div>
  );
}
