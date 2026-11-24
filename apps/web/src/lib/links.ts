// Every address the site builds from a stay or a contact detail is made here.

export interface StayChoice {
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
}

function stayParams({ checkIn, checkOut, guests }: StayChoice): URLSearchParams {
  const p = new URLSearchParams();
  if (checkIn) p.set("checkIn", checkIn);
  if (checkOut) p.set("checkOut", checkOut);
  if (guests) p.set("guests", String(guests));
  return p;
}

/** A home's page, carrying the dates and guests already chosen. */
export function stayUrl(slug: string, stay: StayChoice = {}): string {
  const q = stayParams(stay).toString();
  return `/stays/${slug}${q ? `?${q}` : ""}`;
}

/** The checkout for a home and dates. */
export function bookUrl(listingId: string, stay: { checkIn: string; checkOut: string; guests: number }): string {
  const p = new URLSearchParams({ listing: listingId });
  stayParams(stay).forEach((v, k) => p.set(k, v));
  return `/book?${p}`;
}

export const bookingUrl = (token: string, page: "" | "receipt" | "calendar.ics" = "") => `/booking/${encodeURIComponent(token)}${page ? `/${page}` : ""}`;

/**
 * A path on this site, or null. Where a link may say "go here next", only a plain path is followed:
 * "//host", "/\host" and anything with control characters would leave the site.
 */
export function safePath(value: string | null | undefined): string | null {
  if (!value || !/^\/(?![/\\])/.test(value)) return null;
  for (const ch of value) if (ch === "\\" || ch.charCodeAt(0) < 32) return null;
  return value;
}

/** A WhatsApp chat with the host, with the message filled in. Null when there is no number. */
export function whatsappUrl(number: string | null | undefined, text?: string): string | null {
  const to = number?.replace(/\D/g, "");
  return to ? `https://wa.me/${to}${text ? `?text=${encodeURIComponent(text)}` : ""}` : null;
}

export const telUrl = (phone: string | null | undefined) => (phone ? `tel:${phone.replace(/\s/g, "")}` : null);

export const mapsUrl = (at: { lat: number; lng: number } | null | undefined) =>
  at ? `https://www.google.com/maps/search/?api=1&query=${at.lat},${at.lng}` : null;
