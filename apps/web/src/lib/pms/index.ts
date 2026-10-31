import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { pmsConfigured, pmsFetch } from "./http";
import { mock } from "./mock";
import type {
  Availability,
  BookingHold,
  BookingSummary,
  CreateBookingInput,
  Listing,
  ListingSummary,
  PaymentInput,
  PaymentResult,
  GuestSession,
  Quote,
  RequestContext,
  SearchQuery,
  SearchResult,
  SessionGrant,
  Site,
  TripSummary,
} from "./types";
import { PmsError } from "./types";

// The only door from the website to the PMS. Pages call these functions; nothing else talks to
// the backend. Catalogue reads are cached and invalidated by tag when the PMS publishes changes
// (`site:{key}`, `listing:{key}:{slug}`); availability, quotes and bookings are never cached.

const useMock = !pmsConfigured && (process.env.NODE_ENV !== "production" || process.env.SUPRHOST_USE_MOCK === "1");

if (!pmsConfigured && !useMock) {
  throw new Error("PMS_API_URL, PMS_API_KEY_ID and PMS_API_SECRET must be set in production.");
}

const site = (key: string) => encodeURIComponent(key);

async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof PmsError && e.status === 404) return null;
    throw e;
  }
}

function abuseHeaders(ctx: RequestContext): Record<string, string> {
  return {
    "Idempotency-Key": ctx.idempotencyKey,
    "X-Client-IP": ctx.clientIp,
    "X-Client-User-Agent": ctx.userAgent.slice(0, 256),
    ...(ctx.turnstileToken ? { "X-Turnstile-Token": ctx.turnstileToken } : {}),
  };
}

export async function getSite(key: string): Promise<Site | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`site:${key}`);
  return useMock ? mock.site(key) : orNull(pmsFetch<Site>(`/sites/${site(key)}`));
}

export async function getListings(key: string): Promise<ListingSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`site:${key}`, `listings:${key}`);
  // Unknown site (404) means no listings, never an error: pages and the sitemap render empty.
  return useMock ? mock.listings(key) : ((await orNull(pmsFetch<ListingSummary[]>(`/sites/${site(key)}/listings`))) ?? []);
}

export async function getListing(key: string, slug: string): Promise<Listing | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`site:${key}`, `listing:${key}:${slug}`);
  return useMock
    ? mock.listing(key, slug)
    : orNull(pmsFetch<Listing>(`/sites/${site(key)}/listings/${encodeURIComponent(slug)}`));
}

export async function getAvailability(key: string, listingId: string, from: string, to: string): Promise<Availability> {
  return useMock
    ? mock.availability(key, listingId, from, to)
    : pmsFetch<Availability>(
        `/sites/${site(key)}/listings/${encodeURIComponent(listingId)}/availability?from=${from}&to=${to}`,
      );
}

export async function getQuote(key: string, listingId: string, checkIn: string, checkOut: string, guests: number): Promise<Quote> {
  return useMock
    ? mock.quote(key, listingId, checkIn, checkOut, guests)
    : pmsFetch<Quote>(
        `/sites/${site(key)}/listings/${encodeURIComponent(listingId)}/quote?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`,
      );
}

/** Creates a booking that holds its dates until paid or until the hold expires. */
/** Bookings belong to a signed-in guest: the session must match the booking email. */
export async function createBooking(key: string, input: CreateBookingInput, ctx: RequestContext, sessionToken: string): Promise<BookingHold> {
  if (useMock) return mock.createBooking(key, input, sessionToken);
  return pmsFetch<BookingHold>(`/sites/${site(key)}/bookings`, {
    method: "POST",
    body: input,
    headers: { ...abuseHeaders(ctx), "X-Guest-Session": sessionToken },
  });
}

/** Booking as seen by the holder of its secret token. Never cached. */
export async function getBooking(key: string, token: string): Promise<BookingSummary | null> {
  if (useMock) return mock.booking(key, token);
  return orNull(pmsFetch<BookingSummary>(`/sites/${site(key)}/bookings/${encodeURIComponent(token)}`));
}

/** Starts payment through the tenant's payment plugin ("simulated" confirms immediately). */
export async function payBooking(key: string, token: string, payment: PaymentInput, ctx: RequestContext): Promise<PaymentResult> {
  if (useMock) return mock.pay(key, token, payment);
  return pmsFetch<PaymentResult>(`/sites/${site(key)}/bookings/${encodeURIComponent(token)}/payments`, {
    method: "POST",
    body: payment,
    headers: abuseHeaders(ctx),
  });
}

/** Listings matching filters; with dates, unavailable stays are dropped and totals priced. */
export async function searchListings(key: string, q: SearchQuery): Promise<SearchResult> {
  if (useMock) return mock.search(key, q);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    params.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  return pmsFetch<SearchResult>(`/sites/${site(key)}/search?${params}`);
}

// ---- guest accounts: passwordless email codes; the PMS owns codes and sessions -------------

/**
 * Asks the PMS to email a sign-in code. The code itself comes back only from the mock or from a
 * PMS deployment without an email provider that opts in for testing (refused in production).
 */
export async function requestSignInCode(key: string, email: string, ctx: RequestContext): Promise<{ testModeCode: string | null }> {
  if (useMock) return { testModeCode: await mock.requestCode(key, email) };
  const res = await pmsFetch<{ testModeCode?: string }>(`/sites/${site(key)}/auth/code`, { method: "POST", body: { email }, headers: abuseHeaders(ctx) });
  // Present only when the PMS has no email provider yet and is configured to expose codes (never in production).
  return { testModeCode: res.testModeCode ?? null };
}

export async function verifySignInCode(
  key: string,
  email: string,
  code: string,
  ctx: RequestContext,
  details: { name?: string; phone?: string } = {},
): Promise<SessionGrant> {
  if (useMock) return mock.verifyCode(key, email, code, details);
  return pmsFetch<SessionGrant>(`/sites/${site(key)}/auth/verify`, {
    method: "POST",
    body: { email, code, ...details },
    headers: abuseHeaders(ctx),
  });
}

export async function getGuestSession(key: string, sessionToken: string): Promise<GuestSession | null> {
  if (useMock) return mock.me(key, sessionToken);
  try {
    return await pmsFetch<GuestSession>(`/sites/${site(key)}/me`, { headers: { "X-Guest-Session": sessionToken } });
  } catch (e) {
    if (e instanceof PmsError && (e.status === 401 || e.status === 404)) return null;
    throw e;
  }
}

export async function getTrips(key: string, sessionToken: string): Promise<TripSummary[]> {
  if (useMock) return mock.trips(key, sessionToken);
  return pmsFetch<TripSummary[]>(`/sites/${site(key)}/me/trips`, { headers: { "X-Guest-Session": sessionToken } });
}

export async function endGuestSession(key: string, sessionToken: string): Promise<void> {
  if (useMock) return mock.logout(key, sessionToken);
  await pmsFetch<unknown>(`/sites/${site(key)}/auth/logout`, { method: "POST", headers: { "X-Guest-Session": sessionToken } });
}

export { PmsError } from "./types";
export type * from "./types";
