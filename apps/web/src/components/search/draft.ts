import type { SearchQuery } from "@/lib/pms/types";
import type { WhenDraft } from "./when-panel";

/** The search panel's working copy of the query: nothing is applied until "Search". */
export interface Draft extends WhenDraft {
  city?: string;
  adults: number;
  children: number;
}

export function draftFrom(q: SearchQuery): Draft {
  const children = q.children ?? 0;
  return {
    city: q.city,
    mode: (q.stay || q.months?.length) && !q.checkIn ? "flexible" : "dates",
    checkIn: q.checkIn,
    checkOut: q.checkOut,
    flex: q.flex,
    stay: q.stay,
    months: q.months ?? [],
    children,
    adults: Math.max(0, (q.guests ?? 0) - children),
  };
}

/** Back into a query, keeping the filters, sort and anything else the guest had set. */
export function applyDraft(d: Draft, base: SearchQuery): SearchQuery {
  const guests = d.adults + d.children;
  const dated = d.mode === "dates" && d.checkIn && d.checkOut;
  const flexible = d.mode === "flexible" && (d.stay || d.months.length > 0);
  return {
    ...base,
    city: d.city || undefined,
    checkIn: dated ? d.checkIn : undefined,
    checkOut: dated ? d.checkOut : undefined,
    flex: dated ? d.flex : undefined,
    stay: flexible ? d.stay : undefined,
    months: flexible && d.months.length ? d.months : undefined,
    guests: guests || undefined,
    children: guests && d.children ? d.children : undefined,
    bounds: undefined, // a new search starts from the whole area, not the old map window
  };
}

export const EMPTY_DRAFT: Draft = { mode: "dates", months: [], adults: 0, children: 0 };
