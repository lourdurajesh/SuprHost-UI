// ISO calendar dates (YYYY-MM-DD) handled as UTC midnight so nights never shift with time zones.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function toUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toIso(new Date(toUtc(iso).getTime() + days * DAY_MS));
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((toUtc(checkOut).getTime() - toUtc(checkIn).getTime()) / DAY_MS);
}

/** Today's date in the property's time zone. */
export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** True when any night in [checkIn, checkOut) falls inside a busy range. */
export function overlapsBusy(checkIn: string, checkOut: string, busy: { start: string; end: string }[]): boolean {
  return busy.some((b) => checkIn < b.end && b.start < checkOut);
}

/** Shortest stay for a check-in on `checkIn`: a seasonal rule covering that night, or the listing's own minimum. */
export function minNightsOn(checkIn: string, rules: { start: string; end: string; minNights: number }[], fallback: number): number {
  return rules.find((r) => checkIn >= r.start && checkIn < r.end)?.minNights ?? fallback;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "UTC" }).format(toUtc(iso));
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}
