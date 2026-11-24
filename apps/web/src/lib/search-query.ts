import { formatDate } from "@/lib/dates";
import type { SearchQuery, StayLength } from "@/lib/pms/types";

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
    const length = q.stay ? STAY_LABEL[q.stay] : "Any length";
    const months = q.months?.length ? ` in ${q.months.map((m) => monthName(m, short || q.months!.length > 1)).join(", ")}` : "";
    return `${length}${months}`;
  }
  return "Add dates";
}

/** What the "Who" segment shows. */
export function describeWho(q: SearchQuery): string {
  if (!q.guests) return "Add guests";
  return `${q.guests} guest${q.guests === 1 ? "" : "s"}`;
}
