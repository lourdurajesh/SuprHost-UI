import { addDays, nightsBetween } from "./dates";

// Short links to a home: /s/<code>, where the code is worked out from the home's id, so nothing has
// to be stored and a link keeps working when the home is renamed. Dates and guests travel in a short
// tail: /s/1k9x2ab-jz-2-3 is that home, from day "jz" (counted from 2025, in base 36), 2 nights, 3 guests.

const EPOCH = "2025-01-01";

/** Seven characters for a home's id (FNV-1a, base 36). */
export function shortCode(id: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, "0");
}

interface SharedStay {
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
}

export function shortPath(id: string, stay: SharedStay = {}): string {
  const { checkIn, checkOut, guests } = stay;
  if (!checkIn || !checkOut || checkOut <= checkIn || checkIn < EPOCH) return `/s/${shortCode(id)}`;
  const tail = [nightsBetween(EPOCH, checkIn).toString(36), nightsBetween(checkIn, checkOut).toString(36), ...(guests ? [guests.toString(36)] : [])];
  return `/s/${shortCode(id)}-${tail.join("-")}`;
}

/** Reads a short link's code back. Anything odd in the tail is dropped, never an error. */
export function parseShort(value: string): { code: string; stay: SharedStay } | null {
  const m = /^([0-9a-z]{7})(?:-([0-9a-z]{1,4})-([0-9a-z]{1,2})(?:-([0-9a-z]{1,2}))?)?$/.exec(value.toLowerCase());
  if (!m) return null;
  const [, code, day, nights, guests] = m;
  if (!day) return { code, stay: {} };
  const n = parseInt(nights, 36);
  const g = guests ? parseInt(guests, 36) : 0;
  const d = parseInt(day, 36);
  if (n < 1 || n > 365 || d > 40_000) return { code, stay: {} };
  const checkIn = addDays(EPOCH, d);
  return { code, stay: { checkIn, checkOut: addDays(checkIn, n), guests: g >= 1 && g <= 50 ? g : null } };
}
