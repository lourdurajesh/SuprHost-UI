"use client";

import Link from "next/link";
import { useState } from "react";
import type { SearchHit, SearchQuery } from "@/lib/pms/types";
import { formatMoney } from "@/lib/dates";
import { ListingPhoto } from "@/themes/escape/listing-media";
import { Icon } from "./icons";
import { StaysMap } from "./stays-map";

interface Props {
  hits: SearchHit[];
  query: SearchQuery;
  currency: string;
}

function compactPrice(amount: number) {
  return amount >= 1000 ? `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k` : `₹${amount}`;
}

// List + map, Airbnb-style: hovering a card highlights its pin and vice versa. On phones the map
// is a full-screen toggle so the list stays fast to scroll.
export function SearchResults({ hits, query, currency }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const carry = new URLSearchParams(
    Object.entries({ checkIn: query.checkIn, checkOut: query.checkOut, guests: query.guests })
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();

  const pins = hits
    .filter((h) => h.location)
    .map((h) => ({
      id: h.id,
      lat: h.location!.lat,
      lng: h.location!.lng,
      label: compactPrice(h.fromPrice),
      href: `/stays/${h.slug}${carry ? `?${carry}` : ""}`,
      title: h.name,
    }));

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
          <li key={h.id} onMouseEnter={() => setActive(h.id)} onMouseLeave={() => setActive(null)}>
            <Link href={`/stays/${h.slug}${carry ? `?${carry}` : ""}`} className="group block">
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
              <p className="mt-3 text-sm text-ink-soft">
                {h.city} · {h.propertyName}
              </p>
              <h3 className="mt-0.5 text-xl tracking-tight group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                {h.name}
              </h3>
              <p className="mt-0.5 text-sm text-ink-soft">
                {h.maxGuests} guests{h.bedrooms ? ` · ${h.bedrooms} bedroom${h.bedrooms === 1 ? "" : "s"}` : ""}
                {h.bathrooms ? ` · ${h.bathrooms} bath${h.bathrooms === 1 ? "" : "s"}` : ""}
              </p>
              <p className="mt-2 text-base">
                {h.total && h.nights ? (
                  <>
                    <span>{formatMoney(h.total, currency)}</span>
                    <span className="text-ink-soft">
                      {" "}
                      total · {h.nights} night{h.nights === 1 ? "" : "s"}
                    </span>
                  </>
                ) : (
                  <>
                    <span>{formatMoney(h.fromPrice, currency)}</span>
                    <span className="text-ink-soft"> / night</span>
                  </>
                )}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {/* Sticky on the wrapper: MapLibre forces position:relative on its own container. */}
      <div className={`${showMap ? "block" : "hidden"} lg:block`}>
        <div className="lg:sticky lg:top-[170px]">
          <StaysMap
            key={hits.map((h) => h.id).join(",")}
            pins={pins}
            activeId={active}
            onPinHover={setActive}
            className="h-[70svh] rounded-3xl lg:h-[calc(100svh-200px)]"
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
