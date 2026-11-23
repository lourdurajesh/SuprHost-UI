import Link from "next/link";
import { formatMoney } from "@/lib/dates";
import type { GroupSuggestion } from "@/lib/group-stays";

/**
 * Shown when the party is bigger than any single home: homes at the same place that sleep them
 * together. Each home is its own booking (there is no multi-home checkout), and availability is
 * checked on each stay page with the dates carried over, so the copy says so plainly.
 */
export function GroupSuggestions({
  suggestions,
  guests,
  checkIn,
  checkOut,
  currency,
}: {
  suggestions: GroupSuggestion[];
  guests: number;
  checkIn?: string;
  checkOut?: string;
  currency: string;
}) {
  if (suggestions.length === 0) return null;
  const dates = checkIn && checkOut ? { checkIn, checkOut } : {};
  return (
    <section className="mb-8 rounded-3xl bg-sand-deep p-6 sm:p-8" aria-labelledby="group-heading">
      <h2 id="group-heading" className="text-h2">
        Travelling with {guests}? Stay side by side.
      </h2>
      <p className="mt-2 max-w-2xl text-ink-soft">
        No single home sleeps {guests}, but these sleep your group together. Each home is booked separately, so check the dates on each.
      </p>
      <ul className="mt-6 grid gap-4 lg:grid-cols-2">
        {suggestions.map((g) => (
          <li key={`${g.propertyName}-${g.city}`} className="rounded-2xl bg-white p-5">
            <p className="text-sm text-ink-soft">
              {g.city} · {g.propertyName}
            </p>
            <p className="mt-1 font-medium">Sleeps {g.capacity} across {g.stays.length} homes</p>
            <ul className="mt-3 space-y-1">
              {g.stays.map((s, i) => {
                // Split the party across the homes, filling the biggest first.
                const before = g.stays.slice(0, i).reduce((n, x) => n + x.maxGuests, 0);
                const party = Math.max(1, Math.min(s.maxGuests, guests - before));
                const q = new URLSearchParams({ ...dates, guests: String(party) } as Record<string, string>);
                return (
                  <li key={s.id}>
                    <Link href={`/stays/${s.slug}?${q}`} className="flex min-h-11 items-center justify-between gap-4 underline-offset-4 hover:underline">
                      <span>
                        {s.name} <span className="text-ink-soft">· up to {s.maxGuests}</span>
                      </span>
                      <span className="shrink-0 text-ink-soft">from {formatMoney(s.fromPrice, currency)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
