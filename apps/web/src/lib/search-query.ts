import { formatDate } from "@/lib/dates";
import type { PropertyType, SearchQuery, SearchSort, StayLength } from "@/lib/pms/types";

/** Search state lives in the URL; this is its one writer, so the bar, the filters and the hero agree. */
export function toSearchString(q: SearchQuery): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === "" || v === null || (Array.isArray(v) && v.length === 0)) continue;
    p.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

/**
 * The search in the current URL, for the header. The server validates the same parameters with
 * searchParamsSchema; this only has to be safe to show, so anything odd is dropped.
 */
export function queryFromParams(p: { get(name: string): string | null }): SearchQuery {
  const num = (k: string) => {
    const n = Number(p.get(k));
    return Number.isInteger(n) && n > 0 ? n : undefined;
  };
  const date = (k: string) => {
    const v = p.get(k) ?? "";
    return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined;
  };
  const list = (k: string) => {
    const v = (p.get(k) ?? "").split(",").filter(Boolean);
    return v.length ? v : undefined;
  };
  const checkIn = date("checkIn");
  const checkOut = date("checkOut");
  const dated = checkIn && checkOut && checkOut > checkIn;
  const stay = p.get("stay") ?? "";
  const months = list("months")?.filter((m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m));
  return {
    checkIn: dated ? checkIn : undefined,
    checkOut: dated ? checkOut : undefined,
    flex: dated ? num("flex") : undefined,
    stay: stay in STAY_LABEL ? (stay as StayLength) : undefined,
    months: months?.length ? months : undefined,
    guests: num("guests"),
    children: num("children"),
    city: p.get("city") || undefined,
    minPrice: num("minPrice"),
    maxPrice: num("maxPrice"),
    bedrooms: num("bedrooms"),
    beds: num("beds"),
    bathrooms: num("bathrooms"),
    instantBook: p.get("instantBook") === "true" || undefined,
    types: list("types") as PropertyType[] | undefined,
    amenities: list("amenities"),
    sort: (p.get("sort") as SearchSort | null) ?? undefined,
  };
}

export const STAY_LABEL: Record<StayLength, string> = { weekend: "Weekend", week: "Week", month: "Month" };

const MONTH = new Intl.DateTimeFormat("en-IN", { month: "long", timeZone: "UTC" });
const MONTH_SHORT = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });

/** "2026-12" → "December" (or "Dec"). */
export const monthName = (ym: string, short = false) => (short ? MONTH_SHORT : MONTH).format(new Date(`${ym}-01T00:00:00Z`));

/** What the "When" segment shows: dates, a flexible choice, or an invitation. */
export function describeWhen(q: SearchQuery, short = false): string {
  if (q.checkIn && q.checkOut) {
    const range = `${formatDate(q.checkIn, { day: "numeric", month: "short" })} – ${formatDate(q.checkOut, { day: "numeric", month: "short" })}`;
    return q.flex ? `${range} (±${q.flex})` : range;
  }
  if (q.stay || q.months?.length) {
    const length = STAY_LABEL[q.stay ?? "weekend"]; // no length in the link means a weekend
    const months = q.months?.length ? ` in ${q.months.map((m) => monthName(m, short || q.months!.length > 1)).join(", ")}` : ", any time";
    return `${length}${months}`;
  }
  return "Add dates";
}

/** What the "Who" segment shows. */
export function describeWho(q: SearchQuery): string {
  if (!q.guests) return "Add guests";
  return `${q.guests} guest${q.guests === 1 ? "" : "s"}`;
}
