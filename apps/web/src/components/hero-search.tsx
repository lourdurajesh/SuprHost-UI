"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateRangeField } from "./date-range-field";
import { Icon } from "./icons";
import { toSearchString } from "./search-filters";

// Pill search bar in the hero: location · add dates · guests → the /stays results page.
export function HeroSearch({ cities }: { cities: string[] }) {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [dates, setDates] = useState<{ checkIn: string | null; checkOut: string | null }>({ checkIn: null, checkOut: null });
  const [guests, setGuests] = useState(2);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(
      `/stays${toSearchString({
        city: city || undefined,
        checkIn: dates.checkIn ?? undefined,
        checkOut: dates.checkOut ?? undefined,
        guests,
      })}`,
    );
  }

  const label = "block text-eyebrow uppercase text-ink-soft";
  const field = "select-chevron min-h-8 w-full bg-transparent text-base text-ink outline-none";
  const divider = <span aria-hidden className="hidden h-10 w-px bg-line sm:block" />;
  return (
    <form
      onSubmit={submit}
      className="grid w-full max-w-3xl grid-cols-2 gap-1 rounded-3xl bg-white p-2 text-ink shadow-[0_18px_50px_-15px_rgba(0,0,0,0.45)] sm:flex sm:items-center sm:rounded-full sm:pl-6"
    >
      <label className="col-span-2 rounded-2xl px-4 py-2 sm:min-w-0 sm:flex-[1.1] sm:px-0">
        <span className={label}>Location</span>
        <select value={city} onChange={(e) => setCity(e.target.value)} className={field}>
          <option value="">Anywhere</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      {divider}
      <div className="px-4 py-2 sm:min-w-0 sm:flex-1 sm:px-3">
        <DateRangeField variant="field" label="Dates" checkIn={dates.checkIn} checkOut={dates.checkOut} onChange={(ci, co) => setDates({ checkIn: ci, checkOut: co })} />
      </div>
      {divider}
      <label className="px-4 py-2 sm:w-28 sm:px-4">
        <span className={label}>Guests</span>
        <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className={field}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-medium text-white transition hover:brightness-125 sm:ml-1"
      >
        Search stays <Icon name="arrowRight" className="h-4 w-4" />
      </button>
    </form>
  );
}
