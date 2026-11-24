import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type {
  Availability,
  BookingHold,
  BookingSummary,
  CancelResult,
  CreateBookingInput,
  Listing,
  PaymentInput,
  PaymentResult,
  Quote,
  SearchHit,
  SearchQuery,
  SearchResult,
  SessionGrant,
  GuestSession,
  Site,
  TripSummary,
} from "./types";
import { PmsError } from "./types";
import demo from "./demo-data.json";
import { addDays, nightsBetween, overlapsBusy, toIso } from "@/lib/dates";

// Development stand-in for the PMS public API. Used only when PMS_API_URL is not set and never
// in production (see ./index.ts). Bookings live in process memory and vanish on restart.

const site: Site = {
  key: "demo",
  canonicalUrl: "http://localhost:3000",
  brandName: demo.site.brandName,
  tagline: demo.site.tagline,
  intro: demo.site.intro,
  statement: demo.site.statement,
  logoUrl: null,
  heroImage: demo.site.heroImage,
  theme: "escape",
  colors: { primary: "#3D3A3A", accent: "#4E8E82" },
  about: demo.site.about,
  highlights: demo.site.highlights,
  testimonials: [], // real guest words only: none are copied in as samples
  faqs: demo.site.faqs,
  contact: {
    email: "stay@example.com",
    phone: "+91 98400 00000",
    whatsapp: "+919840000000",
    address: "Chennai, Tamil Nadu",
  },
  location: demo.site.location,
  policies: {
    checkInTime: "13:00",
    checkOutTime: "11:00",
    cancellation: "Free cancellation up to 7 days before check-in. After that, the first night is non-refundable.",
    houseRules: ["No smoking indoors", "No parties or events", "Quiet hours 22:00 – 07:00"],
  },
  seo: demo.site.seo,
  currency: "INR",
  timezone: "Asia/Kolkata",
  payments: { mode: "simulated", methods: ["upi", "card", "netbanking"], holdMinutes: 15 },
  features: ["website.public", "website.instant_book"],
  pricesAddGst: false,
  gstin: null,
};

const listings: Listing[] = demo.homes.map((h, i) => ({
  id: `7d2f0c1e-0000-4000-8000-0000000000${String(i + 1).padStart(2, "0")}`,
  slug: h.slug,
  name: h.name,
  propertyType: h.type as Listing["propertyType"],
  instantBook: true,
  tagline: h.tagline,
  propertyName: h.property,
  city: h.city,
  maxGuests: h.guests,
  bedrooms: h.bedrooms,
  beds: h.beds,
  bathrooms: h.baths,
  fromPrice: h.price,
  image: h.images[0],
  images: h.images,
  description: h.description,
  highlights: h.highlights,
  amenities: h.amenities,
  houseRules: h.houseRules,
  location: { lat: h.lat, lng: h.lng },
  minNights: 1,
  maxNights: 30,
}));

// ---- bookings (in memory) ------------------------------------------------------------------

interface StoredBooking {
  token: string;
  reference: string;
  status: "pending_payment" | "confirmed" | "cancelled";
  input: CreateBookingInput;
  quote: Quote;
  holdExpiresAt: number;
  paidAt: number | null;
  method: PaymentInput["method"] | null;
}

const store = ((globalThis as { __suprhostMock?: Map<string, StoredBooking> }).__suprhostMock ??= new Map());

function isLive(b: StoredBooking, now = Date.now()) {
  return b.status === "confirmed" || (b.status === "pending_payment" && b.holdExpiresAt > now);
}

function heldRanges(listingId: string) {
  return [...store.values()]
    .filter((b) => b.input.listingId === listingId && isLive(b))
    .map((b) => ({ start: b.input.checkIn, end: b.input.checkOut }));
}

function seededBusy(listingId: string, from: string) {
  const offset = 3 + ((Number(listingId.slice(-2)) * 5) % 11);
  return [
    { start: addDays(from, offset), end: addDays(from, offset + 3) },
    { start: addDays(from, offset + 12), end: addDays(from, offset + 14) },
  ];
}

const today = () => toIso(new Date());

function buildQuote(listing: Listing, checkIn: string, checkOut: string, guests: number): Quote {
  const nights = nightsBetween(checkIn, checkOut);
  const stay = nights * listing.fromPrice;
  return {
    listingId: listing.id,
    checkIn,
    checkOut,
    guests,
    nights,
    currency: site.currency,
    lines: [{ label: `₹${listing.fromPrice.toLocaleString("en-IN")} × ${nights} night${nights === 1 ? "" : "s"}`, amount: stay }],
    subtotal: stay,
    taxes: [],
    total: stay,
  };
}

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 1)}${"•".repeat(Math.max(2, user.length - 1))}@${domain}`;
}

// Mock only: saved stays per session token, in memory.
const wishlists = new Map<string, Set<string>>();

function summary(b: StoredBooking): BookingSummary {
  const listing = listings.find((l) => l.id === b.input.listingId)!;
  const expired = b.status === "pending_payment" && b.holdExpiresAt <= Date.now();
  return {
    reference: b.reference,
    status: expired ? "expired" : b.status,
    listing: { name: listing.name, slug: listing.slug, propertyName: listing.propertyName, image: listing.image },
    checkIn: b.input.checkIn,
    checkOut: b.input.checkOut,
    guests: b.input.guests,
    guestName: b.input.name,
    guestEmailMasked: maskEmail(b.input.email),
    quote: b.quote,
    holdExpiresAt: b.status === "pending_payment" ? new Date(b.holdExpiresAt).toISOString() : null,
    payment: {
      status: b.paidAt ? "paid" : "unpaid",
      method: b.method,
      paidAt: b.paidAt ? new Date(b.paidAt).toISOString() : null,
      mode: site.payments.mode,
    },
    paymentMethods: site.payments.methods,
    manage:
      b.status === "confirmed"
        ? { canCancel: true, canChangeDates: true, freeUntil: addDays(b.input.checkIn, -7), cancellationCharge: 0, refund: b.quote.total, reason: null }
        : null,
  };
}

function toSummary(l: Listing) {
  const { id, slug, name, propertyName, propertyType, city, maxGuests, bedrooms, beds, bathrooms, fromPrice, image, tagline, amenities, location, instantBook } = l;
  return { id, slug, name, propertyName, propertyType, city, maxGuests, bedrooms, beds, bathrooms, fromPrice, image, tagline, amenities, location, instantBook };
}

// ---- guest accounts (in memory) ------------------------------------------------------------

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const g = globalThis as { __suprhostCodes?: Map<string, { hash: string; expiresAt: number; attempts: number }>; __suprhostSessions?: Map<string, { email: string; expiresAt: number }> };
const codes = (g.__suprhostCodes ??= new Map());
const sessions = (g.__suprhostSessions ??= new Map());

/** In the real PMS, role comes from the tenant's staff users; the mock treats the site's own email as the host. */
const accounts = ((g as { __suprhostAccounts?: Map<string, { name?: string; phone?: string }> }).__suprhostAccounts ??= new Map());

function sessionFor(email: string): GuestSession {
  const host = email === site.contact.email;
  const account = accounts.get(email);
  return { email, name: account?.name ?? null, phone: account?.phone ?? null, role: host ? "host" : "guest", pmsUrl: host ? (process.env.PMS_APP_URL ?? "http://localhost:5173") : null };
}

export const mock = {
  site: async (key: string): Promise<Site | null> => (key === site.key ? site : null),

  listings: async (key: string): Promise<Listing[]> => (key === site.key ? listings : []),

  listing: async (key: string, slug: string): Promise<Listing | null> =>
    key === site.key ? (listings.find((l) => l.slug === slug) ?? null) : null,

  availability: async (_key: string, listingId: string, from: string, to: string): Promise<Availability> => ({
    listingId,
    from,
    to,
    busy: [...seededBusy(listingId, today()), ...heldRanges(listingId)],
    rules: [],
  }),

  quote: async (key: string, listingId: string, checkIn: string, checkOut: string, guests: number): Promise<Quote> => {
    const listing = listings.find((l) => l.id === listingId);
    if (!listing || key !== site.key) throw new PmsError(404, "listing_not_found", "Listing not found");
    return buildQuote(listing, checkIn, checkOut, guests);
  },

  createBooking: async (key: string, input: CreateBookingInput, sessionToken: string): Promise<BookingHold> => {
    const session = sessions.get(sha(sessionToken));
    if (!session || session.expiresAt < Date.now()) throw new PmsError(401, "sign_in_required", "Sign in with your email to book.");
    if (session.email !== input.email.toLowerCase()) throw new PmsError(422, "invalid_request", "Book with the email you signed in with.");
    accounts.set(session.email, { ...accounts.get(session.email), name: input.name, phone: input.phone });
    const listing = listings.find((l) => l.id === input.listingId);
    if (!listing || key !== site.key) throw new PmsError(404, "listing_not_found", "Listing not found");
    if (input.guests > listing.maxGuests) throw new PmsError(422, "too_many_guests", "Too many guests for this stay");
    const busy = [...seededBusy(listing.id, today()), ...heldRanges(listing.id)];
    if (overlapsBusy(input.checkIn, input.checkOut, busy)) throw new PmsError(409, "dates_unavailable", "Dates unavailable");

    const token = randomBytes(24).toString("base64url");
    const reference = `KS-${input.checkIn.slice(2).replaceAll("-", "")}-${randomBytes(2).toString("hex").toUpperCase()}`;
    const booking: StoredBooking = {
      token,
      reference,
      status: "pending_payment",
      input,
      quote: buildQuote(listing, input.checkIn, input.checkOut, input.guests),
      holdExpiresAt: Date.now() + site.payments.holdMinutes * 60_000,
      paidAt: null,
      method: null,
    };
    store.set(token, booking);
    return { token, reference, status: "pending_payment", holdExpiresAt: new Date(booking.holdExpiresAt).toISOString() };
  },

  booking: async (key: string, token: string): Promise<BookingSummary | null> => {
    const b = store.get(token);
    return key === site.key && b ? summary(b) : null;
  },

  pay: async (key: string, token: string, payment: PaymentInput): Promise<PaymentResult> => {
    const b = store.get(token);
    if (!b || key !== site.key) throw new PmsError(404, "booking_not_found", "Booking not found");
    if (b.status === "confirmed") return { status: "succeeded" };
    if (b.holdExpiresAt <= Date.now()) throw new PmsError(410, "hold_expired", "This reservation has expired");
    if (!site.payments.methods.includes(payment.method)) throw new PmsError(422, "method_unavailable", "Payment method unavailable");
    b.status = "confirmed";
    b.paidAt = Date.now();
    b.method = payment.method;
    return { status: "succeeded" };
  },

  wishlist: async (key: string, sessionToken: string) => {
    const saved = wishlists.get(sessionToken) ?? new Set<string>();
    return key === site.key ? listings.filter((l) => saved.has(l.id)).map(toSummary) : [];
  },

  setWishlisted: async (_key: string, sessionToken: string, listingId: string, saved: boolean) => {
    const set = wishlists.get(sessionToken) ?? new Set<string>();
    if (saved) set.add(listingId);
    else set.delete(listingId);
    wishlists.set(sessionToken, set);
  },

  cancel: async (key: string, token: string): Promise<CancelResult> => {
    const b = store.get(token);
    if (!b || key !== site.key) throw new PmsError(404, "not_found", "Booking not found");
    b.status = "cancelled";
    return { status: "cancelled", charge: 0, refund: b.quote.total };
  },

  changeDates: async (key: string, token: string, dates: { checkIn: string; checkOut: string }): Promise<BookingSummary> => {
    const b = store.get(token);
    if (!b || key !== site.key) throw new PmsError(404, "not_found", "Booking not found");
    const listing = listings.find((l) => l.id === b.input.listingId)!;
    b.input = { ...b.input, ...dates };
    b.quote = buildQuote(listing, dates.checkIn, dates.checkOut, b.input.guests);
    return summary(b);
  },

  search: async (key: string, q: SearchQuery): Promise<SearchResult> => {
    if (key !== site.key) return { hits: [], facets: { types: [], cities: [], amenities: [], price: { min: 0, max: 0 } } };
    const dated = q.checkIn && q.checkOut && q.checkOut > q.checkIn;
    // "I'm flexible", as the PMS answers it: each home's first free window. No length means a weekend;
    // no usable month (none, past, too far off) means the next six.
    const flexible = !dated && Boolean(q.stay || q.months?.length);
    const stay = q.stay ?? "weekend";
    const flexNights = { weekend: 2, week: 7, month: 28 }[stay];
    const windows: { checkIn: string; checkOut: string }[] = [];
    if (flexible) {
      const [y, mo] = today().split("-").map(Number);
      const upcoming = Array.from({ length: 24 }, (_, i) => new Date(Date.UTC(y, mo - 1 + i, 1)).toISOString().slice(0, 7));
      const chosen = upcoming.filter((m) => q.months?.includes(m)).slice(0, 6);
      for (const m of chosen.length ? chosen : upcoming.slice(0, 6)) {
        for (let d = `${m}-01`; d.startsWith(m); d = addDays(d, 1)) {
          if (d < today()) continue;
          if (stay === "weekend" && new Date(`${d}T00:00:00Z`).getUTCDay() !== 5) continue;
          windows.push({ checkIn: d, checkOut: addDays(d, flexNights) });
        }
      }
    }
    const nights = dated ? nightsBetween(q.checkIn!, q.checkOut!) : flexible ? flexNights : null;
    let hits: SearchHit[] = listings.map((l) => {
      const summary = toSummary(l);
      const busy = [...seededBusy(summary.id, today()), ...heldRanges(summary.id)];
      if (flexible) {
        const fits = flexNights >= l.minNights && flexNights <= l.maxNights;
        const win = fits ? windows.find((w) => !overlapsBusy(w.checkIn, w.checkOut, busy)) : undefined;
        return { ...summary, available: !!win, altCheckIn: win?.checkIn ?? null, altCheckOut: win?.checkOut ?? null, nights, total: win ? flexNights * summary.fromPrice : null };
      }
      return {
        ...summary,
        available: dated ? !overlapsBusy(q.checkIn!, q.checkOut!, busy) : null,
        nights,
        total: nights ? nights * summary.fromPrice : null,
      };
    });
    const facetBase = hits;
    hits = hits.filter(
      (h) =>
        (!q.guests || h.maxGuests >= q.guests) &&
        (!q.bedrooms || (h.bedrooms ?? 0) >= q.bedrooms) &&
        (!q.beds || (h.beds ?? 0) >= q.beds) &&
        (!q.bathrooms || (h.bathrooms ?? 0) >= q.bathrooms) &&
        (!q.instantBook || h.instantBook) &&
        (!q.minPrice || h.fromPrice >= q.minPrice) &&
        (!q.maxPrice || h.fromPrice <= q.maxPrice) &&
        (!q.types?.length || q.types.includes(h.propertyType)) &&
        (!q.city || h.city === q.city) &&
        (!q.amenities?.length || q.amenities.every((a) => h.amenities.includes(a))) &&
        h.available !== false,
    );
    if (q.sort === "price_asc") hits.sort((a, b) => a.fromPrice - b.fromPrice);
    if (q.sort === "price_desc") hits.sort((a, b) => b.fromPrice - a.fromPrice);
    const count = <T extends string>(vals: T[]) =>
      [...new Set(vals)].map((value) => ({ value, count: vals.filter((v) => v === value).length }));
    const prices = facetBase.map((h) => h.fromPrice);
    return {
      hits,
      facets: {
        types: count(facetBase.map((h) => h.propertyType)),
        cities: count(facetBase.map((h) => h.city)),
        amenities: [...new Set(facetBase.flatMap((h) => h.amenities))].sort(),
        price: { min: Math.min(...prices), max: Math.max(...prices) },
      },
    };
  },

  requestCode: async (key: string, email: string): Promise<string | null> => {
    if (key !== site.key) return null;
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    codes.set(email, { hash: sha(code), expiresAt: Date.now() + 10 * 60_000, attempts: 0 });
    // Dev mock only: the real PMS emails the code. Never log codes outside the mock.
    console.info(`[mock] sign-in code for ${email}: ${code}`);
    return code;
  },

  verifyCode: async (key: string, email: string, code: string, details: { name?: string; phone?: string; contactEmail?: string } = {}): Promise<SessionGrant> => {
    const entry = codes.get(email);
    if (key !== site.key || !entry || entry.expiresAt < Date.now() || entry.attempts >= 5) {
      throw new PmsError(401, "invalid_code", "That code is invalid or has expired");
    }
    entry.attempts += 1;
    const a = Buffer.from(entry.hash), b = Buffer.from(sha(code));
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new PmsError(401, "invalid_code", "That code is invalid or has expired");
    codes.delete(email);
    const sessionToken = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + 30 * 24 * 3600_000;
    sessions.set(sha(sessionToken), { email, expiresAt });
    const known = accounts.get(email) ?? {};
    accounts.set(email, { name: details.name || known.name, phone: details.phone || known.phone });
    return { sessionToken, expiresAt: new Date(expiresAt).toISOString(), session: sessionFor(email) };
  },

  me: async (key: string, sessionToken: string): Promise<GuestSession | null> => {
    const s = sessions.get(sha(sessionToken));
    if (key !== site.key || !s || s.expiresAt < Date.now()) return null;
    return sessionFor(s.email);
  },

  trips: async (key: string, sessionToken: string): Promise<TripSummary[]> => {
    const s = sessions.get(sha(sessionToken));
    if (key !== site.key || !s || s.expiresAt < Date.now()) throw new PmsError(401, "unauthenticated", "Sign in again");
    return [...store.values()]
      .filter((b) => b.input.email === s.email && (b.status === "confirmed" || b.status === "cancelled"))
      .sort((x, y) => y.input.checkIn.localeCompare(x.input.checkIn))
      .map((b) => {
        const sum = summary(b);
        return {
          token: b.token,
          reference: b.reference,
          status: sum.status,
          listing: sum.listing,
          checkIn: b.input.checkIn,
          checkOut: b.input.checkOut,
          guests: b.input.guests,
          total: b.quote.total,
          currency: b.quote.currency,
        };
      });
  },

  logout: async (_key: string, sessionToken: string): Promise<void> => {
    sessions.delete(sha(sessionToken));
  },

};
