// Sends a booking (instant: holds the dates for payment) or a request to book (the host accepts
// first) to this site's /api/bookings, and turns every failure into words for the guest.

export interface BookingPayload {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  /** The honeypot field: empty for people. */
  website: string;
  elapsedMs: number;
  /** One per stay and form: a double click or a retry cannot book twice. */
  idempotencyKey: string;
}

export type BookingResult =
  | { ok: true; token: string; status: string }
  | { ok: false; fields?: Record<string, string>; signInExpired?: boolean; message: string };

export async function createBooking(payload: BookingPayload): Promise<BookingResult> {
  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && typeof body.token === "string") return { ok: true, token: body.token, status: String(body.status ?? "") };
    if (res.status === 400 && body.fields) return { ok: false, fields: body.fields, message: "Please check the highlighted details." };
    if (res.status === 401) return { ok: false, signInExpired: true, message: "Your sign-in has expired. Confirm it’s you again to continue." };
    if (res.status === 409) return { ok: false, message: "Sorry, those dates were just booked. Please choose other dates." };
    if (res.status === 422) return { ok: false, message: body.message ?? "These details don't match this stay." };
    if (res.status === 429) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
    return { ok: false, message: "Something went wrong on our side. Please try again, or contact us directly." };
  } catch {
    return { ok: false, message: "Network problem. Please check your connection and try again." };
  }
}

/** Where a new booking goes next: a request waits for the host on its booking page; a booking goes on to payment. */
export const nextPageFor = (token: string, status: string) =>
  `/${status === "awaiting_host" ? "booking" : "checkout"}/${encodeURIComponent(token)}`;
