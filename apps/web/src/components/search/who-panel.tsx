"use client";

import { plural } from "@/lib/text";
import { CountRow } from "./count-row";

const MAX_GUESTS = 20;

/** Adults and children (together they are the search's guest count). */
export function WhoPanel({ adults, kids, onChange }: { adults: number; kids: number; onChange: (adults: number, kids: number) => void }) {
  const total = adults + kids;
  return (
    <div className="divide-y divide-line">
      <CountRow title="Adults" hint="Ages 13 or above" value={adults} max={MAX_GUESTS - kids} onChange={(n) => onChange(n, kids)} />
      <CountRow title="Children" hint="Ages 2–12" value={kids} max={MAX_GUESTS - adults} onChange={(n) => onChange(adults, n)} />
      <p className="pt-4 text-sm text-ink-soft">
        {total === 0 ? "Add the people travelling to see homes that sleep them." : `${plural(total, "guest")} in all. Homes that sleep fewer are left out.`}
      </p>
    </div>
  );
}
