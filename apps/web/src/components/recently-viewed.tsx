"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/dates";
import { useRecentStays } from "./wishlist";

/** A quiet row of the stays this browser viewed recently; nothing renders until there are some. */
export function RecentlyViewed({ currency }: { currency: string }) {
  const recent = useRecentStays();
  if (recent.length === 0) return null;
  return (
    <section aria-labelledby="recent-heading" className="mb-8">
      <h2 id="recent-heading" className="text-sm font-medium text-ink-soft">Recently viewed</h2>
      <ul className="no-scrollbar -mx-4 mt-3 flex gap-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {recent.map((s) => (
          <li key={s.slug} className="w-56 shrink-0">
            <Link href={`/stays/${s.slug}`} className="group flex min-h-11 items-center gap-3">
              <span className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-sand-deep">
                {s.image && (
                  // Small thumbnail of an already-optimised variant; next/image isn't worth it at this size.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image.url} alt="" width={80} height={56} loading="lazy" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm group-hover:underline">{s.name}</span>
                <span className="block truncate text-sm text-ink-soft">
                  {s.place} · {formatMoney(s.fromPrice, currency)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
