"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DateRangeField } from "./date-range-field";
import { Dropdown } from "./dropdown";
import { GuestStepper } from "./guest-stepper";
import { Icon } from "./icons";
import { toSearchString } from "./search-filters";

// Pill search bar in the hero: location · add dates · guests → the /stays results page.
export function HeroSearch({ cities }: { cities: string[] }) {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [dates, setDates] = useState<{ checkIn: string | null; checkOut: string | null }>({ checkIn: null, checkOut: null });
  const [guests, setGuests] = useState(2);

  // The header shows its own search bar once this one has scrolled under it (globals.css).
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const el = form.current;
    if (!el) return;
    const root = document.documentElement;
    const seen = new IntersectionObserver(([e]) => root.toggleAttribute("data-past-hero", !e.isIntersecting && e.boundingClientRect.top < 76), { rootMargin: "-76px 0px 0px" });
    seen.observe(el);
    return () => {
      seen.disconnect();
      root.removeAttribute("data-past-hero");
    };
  }, []);

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
  const field = "select-chevron min-h-8 w-full bg-transparent pr-2 text-base text-ink outline-none";
  const divider = <span aria-hidden className="hidden h-10 w-px bg-line sm:block" />;
  return (
    <form
      ref={form}
      data-hero-search
      onSubmit={submit}
      className="grid w-full max-w-3xl grid-cols-2 gap-1 rounded-3xl bg-white p-2 text-ink shadow-[0_18px_50px_-15px_rgba(0,0,0,0.45)] sm:flex sm:items-center sm:rounded-full sm:pl-2"
    >
      <label data-dropdown-anchor className="col-span-2 rounded-2xl px-4 py-2 transition-colors has-[[aria-expanded=true]]:bg-sand-deep has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink sm:min-w-0 sm:flex-[1.1] sm:rounded-full sm:px-4">
        <span className={label}>Location</span>
        <Dropdown
          aria-label="Location"
          value={city}
          onChange={setCity}
          options={[{ value: "", label: "Anywhere" }, ...cities.map((c) => ({ value: c, label: c }))]}
          variant="floating"
          className={field}
        />
      </label>
      {divider}
      <div className="px-4 py-2 sm:min-w-0 sm:flex-1 sm:px-3">
        <DateRangeField variant="field" label="Dates" checkIn={dates.checkIn} checkOut={dates.checkOut} onChange={(ci, co) => setDates({ checkIn: ci, checkOut: co })} />
      </div>
      {divider}
      <div className="px-4 py-2 sm:w-44 sm:px-4">
        <span className={label}>Guests</span>
        <GuestStepper value={guests} onChange={setGuests} max={12} showUnit={false} compact className="mt-1" />
      </div>
      <button
        type="submit"
        className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-medium text-white transition hover:brightness-125 sm:ml-1"
      >
        Search stays <Icon name="arrowRight" className="h-4 w-4" />
      </button>
    </form>
  );
}
