"use client";

import { useEffect, useState } from "react";
import type { PropertyType, SearchQuery, SearchResult } from "@/lib/pms/types";
import { PROPERTY_TYPE } from "@/lib/listing-facts";
import { toSearchString } from "@/lib/search-query";
import { plural } from "@/lib/text";
import { amenityIcon, Icon } from "../icons";
import { buttonClass, textButton } from "../ui/button";
import { DialogClose } from "../ui/dialog";
import { CountRow } from "./count-row";
import { PriceSlider } from "./price-slider";

const TYPE_ICON: Record<PropertyType, string> = { cottage: "leaf", suite: "bed", villa: "home", home: "home", apartment: "grid" };

/** Everything this modal edits; the rest of the query (dates, guests, place, sort) is left alone. */
const FILTER_KEYS = ["minPrice", "maxPrice", "bedrooms", "beds", "bathrooms", "instantBook", "types", "amenities", "city"] as const;

interface Props {
  onClose: () => void;
  query: SearchQuery;
  facets: SearchResult["facets"];
  prices: number[];
  currency: string;
  onApply: (next: SearchQuery) => void;
}

const sectionClass = "border-t border-line py-8 first:border-t-0 first:pt-2";
const h = "text-lg";

/**
 * The filters popup's content: a title bar, sections separated by lines, and a footer with "Clear all" and
 * a button that says how many homes the choices leave. The count is live: it asks the server about the
 * draft a moment after each change. Nothing reaches the address until that button.
 */
export function FiltersPanel({ query, facets, prices, currency, onApply, onClose: close }: Props) {
  const [draft, setDraft] = useState<SearchQuery>(query);
  const [count, setCount] = useState<number | null>(null);
  const [moreAmenities, setMoreAmenities] = useState(false);

  // Live count: how many homes the draft would show (the dates, guests and place come along).
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search-count${toSearchString({ ...draft, sort: undefined, bounds: undefined })}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(r)))
        .then((d: { count: number }) => setCount(d.count))
        .catch((e) => {
          if (e?.name !== "AbortError") setCount(null);
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [draft]);

  const toggle = <T extends string>(list: T[] | undefined, value: T): T[] | undefined => {
    const set = new Set(list ?? []);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    return set.size ? [...set] : undefined;
  };

  const untouched = FILTER_KEYS.every((k) => {
    const v = draft[k];
    return v === undefined || (Array.isArray(v) && v.length === 0);
  });

  const tile = (on: boolean) =>
    `focus-own flex flex-col items-start gap-3 rounded-xl p-4 text-left text-sm ring-1 transition focus-visible:ring-2 focus-visible:ring-ink ${
      on ? "bg-sand-deep ring-2 ring-ink" : "bg-white ring-line hover:ring-ink"
    }`;

  const recommended = facets.amenities.slice(0, 4);
  const others = facets.amenities.slice(4);
  const shownOthers = moreAmenities ? others : others.slice(0, 6);
  const typeTotal = facets.types.reduce((n, t) => n + t.count, 0);

  return (
    <>
      <div className="relative flex shrink-0 items-center justify-center border-b border-line px-6 py-4">
        <h2 className="text-base font-medium">Filters</h2>
        <DialogClose onClose={close} className="absolute right-3 top-1/2 -translate-y-1/2" />
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
        {recommended.length > 0 && (
          <section className={sectionClass}>
            <h3 className={h}>Recommended for you</h3>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {recommended.map((a) => {
                const on = draft.amenities?.includes(a) ?? false;
                return (
                  <button key={a} type="button" aria-pressed={on} onClick={() => setDraft({ ...draft, amenities: toggle(draft.amenities, a) })} className={tile(on)}>
                    <Icon name={amenityIcon(a)} className="h-7 w-7" strokeWidth={1.4} />
                    <span>{a}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className={sectionClass}>
          <h3 className={h}>Type of place</h3>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <button type="button" aria-pressed={!draft.types?.length} onClick={() => setDraft({ ...draft, types: undefined })} className={tile(!draft.types?.length)}>
              <Icon name="grid" className="h-7 w-7" strokeWidth={1.4} />
              <span>
                Any type <span className="text-ink-soft">· {typeTotal}</span>
              </span>
            </button>
            {facets.types.map((t) => {
              const on = draft.types?.includes(t.value) ?? false;
              return (
                <button key={t.value} type="button" aria-pressed={on} onClick={() => setDraft({ ...draft, types: toggle(draft.types, t.value) })} className={tile(on)}>
                  <Icon name={TYPE_ICON[t.value]} className="h-7 w-7" strokeWidth={1.4} />
                  <span>
                    {PROPERTY_TYPE[t.value]} <span className="text-ink-soft">· {t.count}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={sectionClass}>
          <h3 className={h}>Price</h3>
          <p className="mt-1 text-sm text-ink-soft">Nightly price, before GST</p>
          <PriceSlider
            prices={prices}
            min={facets.price.min}
            max={facets.price.max}
            lo={draft.minPrice}
            hi={draft.maxPrice}
            currency={currency}
            onChange={(minPrice, maxPrice) => setDraft({ ...draft, minPrice, maxPrice })}
          />
        </section>

        <section className={sectionClass}>
          <h3 className={h}>Rooms</h3>
          <div className="mt-2 divide-y divide-line">
            <CountRow title="Bedrooms" value={draft.bedrooms ?? 0} max={8} zeroLabel="Any" onChange={(n) => setDraft({ ...draft, bedrooms: n || undefined })} />
            <CountRow title="Beds" value={draft.beds ?? 0} max={16} zeroLabel="Any" onChange={(n) => setDraft({ ...draft, beds: n || undefined })} />
            <CountRow title="Bathrooms" value={draft.bathrooms ?? 0} max={8} zeroLabel="Any" onChange={(n) => setDraft({ ...draft, bathrooms: n || undefined })} />
          </div>
        </section>

        <section className={sectionClass}>
          <h3 className={h}>Booking options</h3>
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-6">
            <span>
              Instant Book
              <span className="block text-sm text-ink-soft">Homes you can book without waiting for the host to reply</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={draft.instantBook ?? false}
              onChange={(e) => setDraft({ ...draft, instantBook: e.target.checked || undefined })}
              className="peer sr-only"
            />
            <span className="relative h-8 w-12 shrink-0 rounded-full bg-field transition peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-focus-visible:ring-offset-2 after:absolute after:left-1 after:top-1 after:h-6 after:w-6 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" />
          </label>
        </section>

        {others.length > 0 && (
          <section className={sectionClass}>
            <h3 className={h}>Amenities</h3>
            <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {shownOthers.map((a) => {
                const on = draft.amenities?.includes(a) ?? false;
                return (
                  <li key={a}>
                    <label className="flex cursor-pointer items-center gap-4">
                      <input type="checkbox" checked={on} onChange={() => setDraft({ ...draft, amenities: toggle(draft.amenities, a) })} className="peer sr-only" />
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-white ring-1 ring-field transition peer-checked:bg-ink peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
                        {on && <Icon name="check" className="h-4 w-4" strokeWidth={2.6} />}
                      </span>
                      <span>{a}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {others.length > 6 && (
              <button type="button" onClick={() => setMoreAmenities(!moreAmenities)} className={`${textButton} mt-5`}>
                {moreAmenities ? "Show less" : `Show ${others.length - 6} more`}
              </button>
            )}
          </section>
        )}

        {facets.cities.length > 1 && (
          <section className={sectionClass}>
            <h3 className={h}>Popular places</h3>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" aria-pressed={!draft.city} onClick={() => setDraft({ ...draft, city: undefined })} className={chip(!draft.city)}>
                Anywhere
              </button>
              {facets.cities.map((c) => (
                <button key={c.value} type="button" aria-pressed={draft.city === c.value} onClick={() => setDraft({ ...draft, city: c.value })} className={chip(draft.city === c.value)}>
                  {c.value} <span className="text-ink-soft">· {c.count}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-line px-6 py-4 sm:px-8">
        <button
          type="button"
          disabled={untouched}
          onClick={() => setDraft({ ...draft, ...Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])) })}
          className={textButton}
        >
          Clear all
        </button>
        <button
          type="button"
          onClick={() => {
            onApply(draft);
            close();
          }}
          disabled={count === 0}
          className={buttonClass()}
        >
          {count === null ? "Show stays" : count === 0 ? "No stays match" : `Show ${plural(count, "stay")}`}
        </button>
      </div>
    </>
  );
}

const chip = (on: boolean) =>
  `focus-own min-h-11 rounded-full px-4 py-2 text-sm ring-1 transition focus-visible:ring-2 focus-visible:ring-ink ${on ? "bg-sand-deep ring-2 ring-ink" : "bg-white ring-line hover:ring-ink"}`;
