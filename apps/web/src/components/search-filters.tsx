"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { PropertyType, SearchQuery, SearchResult } from "@/lib/pms/types";
import { formatMoney } from "@/lib/dates";
import { DateRangeField } from "./date-range-field";
import { Icon } from "./icons";

const TYPE_LABEL: Record<PropertyType, string> = {
  cottage: "Cottages",
  suite: "Suites",
  villa: "Villas",
  home: "Homes",
  apartment: "Apartments",
};

export function toSearchString(q: SearchQuery): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === "" || v === null || (Array.isArray(v) && v.length === 0)) continue;
    p.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

interface Props {
  query: SearchQuery;
  facets: SearchResult["facets"];
  currency: string;
  count: number;
}

// Search state lives in the URL (shareable, back-button friendly). Dates, guests and sort apply
// at once; the filter panel applies on "Show stays".
export function SearchFilters({ query, facets, currency, count }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<SearchQuery>(query);

  function apply(next: SearchQuery) {
    startTransition(() => router.replace(`${pathname}${toSearchString(next)}`, { scroll: false }));
  }

  function toggle<T extends string>(list: T[] | undefined, value: T): T[] {
    const set = new Set(list ?? []);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    return [...set];
  }

  const activeFilters =
    (query.types?.length ?? 0) +
    (query.amenities?.length ?? 0) +
    (query.bedrooms ? 1 : 0) +
    (query.minPrice || query.maxPrice ? 1 : 0) +
    (query.city ? 1 : 0);

  const field = "rounded-full bg-white px-4 py-2.5 text-sm ring-1 ring-line outline-none focus:ring-ink";
  const chip = (on: boolean) =>
    `rounded-full px-4 py-2 text-sm ring-1 transition ${on ? "bg-ink text-white ring-ink" : "bg-white ring-line hover:ring-ink-soft"}`;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <DateRangeField
        checkIn={query.checkIn ?? null}
        checkOut={query.checkOut ?? null}
        onChange={(ci, co) => apply({ ...query, checkIn: ci ?? undefined, checkOut: co ?? undefined })}
      />
      <select
        aria-label="Guests"
        value={query.guests ?? ""}
        onChange={(e) => apply({ ...query, guests: e.target.value ? Number(e.target.value) : undefined })}
        className={field}
      >
        <option value="">Any guests</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}+ guest{n === 1 ? "" : "s"}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => {
          setDraft(query);
          dialog.current?.showModal();
        }}
        className={`${field} inline-flex items-center gap-2`}
      >
        <Icon name="grid" className="h-4 w-4" /> Filters
        {activeFilters > 0 && <span className="rounded-full bg-ink px-2 text-xs text-white">{activeFilters}</span>}
      </button>
      <select
        aria-label="Sort"
        value={query.sort ?? "recommended"}
        onChange={(e) => apply({ ...query, sort: e.target.value as SearchQuery["sort"] })}
        className={`${field} ml-auto`}
      >
        <option value="recommended">Recommended</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
      </select>

      <dialog
        ref={dialog}
        aria-label="Filters"
        className="m-auto w-[min(640px,calc(100vw-2rem))] rounded-3xl bg-white p-0 text-ink backdrop:bg-black/40"
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <p className="text-lg">Filters</p>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close filters" className="rounded-full p-2 hover:bg-sand-deep">
            <Icon name="close" />
          </button>
        </div>
        <div className="max-h-[65vh] space-y-8 overflow-y-auto px-6 py-6">
          <section>
            <h3 className="text-base">Price per night</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Our stays range from {formatMoney(facets.price.min, currency)} to {formatMoney(facets.price.max, currency)}.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(["minPrice", "maxPrice"] as const).map((k) => (
                <label key={k} className="rounded-2xl px-4 py-2 ring-1 ring-line">
                  <span className="block text-xs text-ink-soft">{k === "minPrice" ? "Minimum" : "Maximum"}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={500}
                    value={draft[k] ?? ""}
                    placeholder={String(k === "minPrice" ? facets.price.min : facets.price.max)}
                    onChange={(e) => setDraft({ ...draft, [k]: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full bg-transparent outline-none"
                  />
                </label>
              ))}
            </div>
          </section>

          {facets.cities.length > 1 && (
            <section>
              <h3 className="text-base">Location</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={chip(!draft.city)} onClick={() => setDraft({ ...draft, city: undefined })}>
                  Anywhere
                </button>
                {facets.cities.map((c) => (
                  <button key={c.value} type="button" className={chip(draft.city === c.value)} onClick={() => setDraft({ ...draft, city: c.value })}>
                    {c.value} <span className="opacity-60">· {c.count}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-base">Type of place</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {facets.types.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={draft.types?.includes(t.value) ?? false}
                  className={chip(draft.types?.includes(t.value) ?? false)}
                  onClick={() => setDraft({ ...draft, types: toggle(draft.types, t.value) })}
                >
                  {TYPE_LABEL[t.value]} <span className="opacity-60">· {t.count}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-base">Bedrooms</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {[undefined, 1, 2, 3, 4, 5].map((n) => (
                <button key={n ?? "any"} type="button" className={chip(draft.bedrooms === n)} onClick={() => setDraft({ ...draft, bedrooms: n })}>
                  {n ? `${n}+` : "Any"}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-base">Amenities</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {facets.amenities.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={draft.amenities?.includes(a) ?? false}
                  className={chip(draft.amenities?.includes(a) ?? false)}
                  onClick={() => setDraft({ ...draft, amenities: toggle(draft.amenities, a) })}
                >
                  {a}
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className="flex items-center justify-between border-t border-line px-6 py-4">
          <button
            type="button"
            className="text-sm underline underline-offset-4"
            onClick={() =>
              setDraft({ checkIn: query.checkIn, checkOut: query.checkOut, guests: query.guests, sort: query.sort })
            }
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => {
              dialog.current?.close();
              apply(draft);
            }}
            className="rounded-full bg-brand px-6 py-3 text-white hover:brightness-125"
          >
            Show stays
          </button>
        </div>
      </dialog>

      <p className="w-full pt-2 text-sm text-ink-soft">
        {pending ? "Updating…" : `${count} stay${count === 1 ? "" : "s"}${query.checkIn && query.checkOut ? " available for your dates" : ""}`}
      </p>
    </div>
  );
}
