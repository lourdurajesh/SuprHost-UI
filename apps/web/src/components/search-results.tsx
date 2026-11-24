"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { SearchHit, SearchQuery } from "@/lib/pms/types";
import { formatDate, formatMoney } from "@/lib/dates";
import { ListingPhoto } from "@/themes/escape/listing-media";
import { PROPERTY_TYPE } from "@/themes/escape/listing-card";
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
  /** Count, applied filters and sort. */
  toolbar: React.ReactNode;
  before?: React.ReactNode;
  after?: React.ReactNode;
  /** The whole area with homes, for the map when nothing matches: [south, west, north, east]. */
  area: [number, number, number, number] | null;
}

function compactPrice(amount: number) {
  return amount >= 1000 ? `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k` : `₹${amount}`;
}

// List + map, Airbnb-style: hovering a card highlights its pin and vice versa. The map stays put under
// the header while the list scrolls; on phones it is a toggle so the list stays fast to scroll. Card
// photos are sized from the window (.stay-photo), so two full rows show before any scrolling.
export function SearchResults({ hits, query, currency, addsGst, toolbar, before, after, area }: Props) {
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

  const empty =
    hits.length > 0 ? null : query.bounds ? (
      <div className="rounded-3xl bg-sand-deep p-10 text-center">
        <p className="text-xl">No stays in this part of the map.</p>
        <p className="mt-2 text-ink-soft">Zoom out or search the whole area.</p>
        <Link href={`${pathname}${toSearchString({ ...query, bounds: undefined })}`} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-brand px-6 text-white">
          Search everywhere
        </Link>
      </div>
    ) : (
      <div className="rounded-3xl bg-sand-deep p-10 text-center">
        <p className="text-xl">No stays match these filters.</p>
        <p className="mt-2 text-ink-soft">Try different dates, fewer filters, or message us — we may be able to help.</p>
        <Link href="/stays" className="mt-6 inline-flex rounded-full bg-brand px-6 py-3 text-white">
          Clear search
        </Link>
      </div>
    );

  return (
    <div className="stays-layout">
      <div className="min-w-0">
        <div className="flex min-h-14 flex-col justify-center py-1">{toolbar}</div>
        <div className={showMap ? "hidden lg:block" : ""}>
          {before}
          {empty}
          <ul className={`grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-6 ${hits.some((h) => h.altCheckIn) ? "has-alt-dates" : ""}`}>
            {hits.map((h, i) => (
              <li key={h.id} className="relative min-w-0" onMouseEnter={() => setActive(h.id)} onMouseLeave={() => setActive(null)}>
                <WishlistButton listingId={h.id} name={h.name} className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3" />
                <Link href={`/stays/${h.slug}${carryFor(h)}`} className="group block">
                  <div className="relative">
                    <ListingPhoto
                      image={h.image}
                      name={h.name}
                      sizes="(min-width: 1024px) 28vw, 50vw"
                      priority={i < 4}
                      className={`stay-photo rounded-2xl ring-2 transition ${active === h.id ? "ring-ink" : "ring-transparent"}`}
                      imgClassName="transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    {h.instantBook && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs shadow-sm sm:left-3 sm:top-3 sm:px-3">
                        <Icon name="bolt" className="h-3.5 w-3.5" /> <span className="max-sm:sr-only">Instant book</span>
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 flex items-center justify-between gap-2 text-base leading-6">
                    <span className="truncate font-medium group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4" title={h.name}>
                      {h.name}
                    </span>
                    <Rating rating={h.rating} className="shrink-0 text-sm text-ink" />
                  </h2>
                  <p className="truncate text-sm leading-5 text-ink-soft">
                    {h.city} · {h.propertyName}
                  </p>
                  <p className="truncate text-sm leading-5 text-ink-soft">
                    <span className="max-sm:hidden">{PROPERTY_TYPE[h.propertyType]} · </span>
                    {[
                      `${h.maxGuests} guest${h.maxGuests === 1 ? "" : "s"}`,
                      h.bedrooms && `${h.bedrooms} bedroom${h.bedrooms === 1 ? "" : "s"}`,
                      h.bathrooms && `${h.bathrooms} bath${h.bathrooms === 1 ? "" : "s"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {h.altCheckIn && h.altCheckOut && (
                    <p className="truncate text-sm font-medium leading-5 text-accent">
                      <span className="max-sm:hidden">Available </span>
                      {formatDate(h.altCheckIn, { day: "numeric", month: "short" })} – {formatDate(h.altCheckOut, { day: "numeric", month: "short" })}
                    </p>
                  )}
                  <p className="truncate text-base leading-6">
                    {h.total && h.nights ? (
                      <>
                        <span className="font-medium">{formatMoney(h.total, currency)}</span>
                        <span className="text-sm text-ink-soft">
                          {" "}
                          for {h.nights} night{h.nights === 1 ? "" : "s"}
                          <span className="max-sm:hidden">{addsGst ? " · incl. GST and fees" : " · incl. fees"}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">{formatMoney(h.fromPrice, currency)}</span>
                        <span className="text-sm text-ink-soft">
                          {" "}
                          / night{addsGst && " + GST"}
                        </span>
                      </>
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10 empty:hidden">{after}</div>
        </div>
      </div>

      {/* Fixed on the wrapper: MapLibre forces position:relative on its own container. */}
      <div className={`${showMap ? "block" : "hidden"} lg:block`}>
        <div className="stays-map relative">
          <label className="absolute left-3 top-3 z-10 flex min-h-11 cursor-pointer items-center gap-3 rounded-full bg-white px-4 text-sm shadow-md ring-1 ring-line has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink">
            <input type="checkbox" checked={followMap} onChange={(e) => toggleFollow(e.target.checked)} className="focus-own h-5 w-5 accent-[var(--brand)]" />
            Search as I move the map
          </label>
          <StaysMap
            key={hits.map((h) => h.id).join(",")}
            pins={pins}
            activeId={active}
            onPinHover={setActive}
            initialBounds={initialBounds ?? (pins.length ? null : area)}
            onMoveEnd={onMapMove}
            className="h-full rounded-3xl"
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
