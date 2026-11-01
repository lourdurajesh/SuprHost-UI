// Public API contract (HostMate-Backend /api/public/v1). Hand-written for v0.1; replaced by the
// OpenAPI-generated client once the backend endpoints exist. Catalogue types carry no guest PII;
// booking types are only returned to the holder of the booking's secret token.

export type FeatureCode =
  | "website.public"
  | "website.instant_book"
  | "website.custom_domain"
  | (string & {});

export type PaymentMethod = "upi" | "card" | "netbanking";

export interface ListingImage {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface Site {
  key: string;
  /** Canonical origin, e.g. https://kaveristays.com — used for metadata, sitemap and redirects. */
  canonicalUrl: string;
  brandName: string;
  tagline: string;
  intro: string;
  /** One or two sentences on how the host looks after guests; the home page's centred statement. */
  statement: string;
  logoUrl: string | null;
  heroImage: ListingImage | null;
  theme: "escape" | "atelier" | "estate";
  colors: { primary: string; accent: string };
  about: { title: string; body: string; image: ListingImage | null } | null;
  highlights: { icon: string; title: string; text: string }[];
  testimonials: { quote: string; author: string; from: string; stay: string }[];
  faqs: { q: string; a: string }[];
  contact: { email: string | null; phone: string | null; whatsapp: string | null; address: string | null };
  location: { lat: number; lng: number; label: string } | null;
  policies: { checkInTime: string; checkOutTime: string; cancellation: string; houseRules: string[] };
  seo: { title: string; description: string };
  currency: string;
  timezone: string;
  /** "simulated" until a payment plugin is enabled: the payment step confirms without charging. */
  payments: { mode: "simulated" | "live"; methods: PaymentMethod[]; holdMinutes: number };
  features: FeatureCode[];
  /** The host is GST-registered: per-night prices are before tax, quotes and trip totals include it. */
  pricesAddGst: boolean;
}

export type PropertyType = "cottage" | "suite" | "villa" | "home" | "apartment";

export interface ListingSummary {
  id: string;
  slug: string;
  name: string;
  propertyName: string;
  propertyType: PropertyType;
  city: string;
  maxGuests: number;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  fromPrice: number;
  image: ListingImage | null;
  tagline: string;
  amenities: string[];
  /** Approximate pin for maps; the exact address is shared after booking. */
  location: { lat: number; lng: number } | null;
  instantBook: boolean;
}

export interface Listing extends ListingSummary {
  description: string;
  highlights: { icon: string; title: string; text: string }[];
  houseRules: string[];
  images: ListingImage[];
  minNights: number;
  maxNights: number;
}

export type SearchSort = "recommended" | "price_asc" | "price_desc";

export interface SearchQuery {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  types?: PropertyType[];
  amenities?: string[];
  city?: string;
  sort?: SearchSort;
}

export interface SearchHit extends ListingSummary {
  /** null when no dates were given. */
  available: boolean | null;
  nights: number | null;
  total: number | null;
}

export interface SearchResult {
  hits: SearchHit[];
  facets: {
    types: { value: PropertyType; count: number }[];
    cities: { value: string; count: number }[];
    amenities: string[];
    price: { min: number; max: number };
  };
}

// ---- guest accounts ----------------------------------------------------------------------

export interface GuestSession {
  email: string;
  name: string | null;
  phone: string | null;
  /** "host" when the email belongs to a staff user of this tenant in the PMS. */
  role: "guest" | "host";
  /** Set for hosts only: where the "Open PMS" link goes. */
  pmsUrl: string | null;
}

export interface SessionGrant {
  sessionToken: string;
  expiresAt: string;
  session: GuestSession;
}

export interface TripSummary {
  /** Secret booking link token; null for stays the host recorded in the PMS (no guest link). */
  token: string | null;
  reference: string;
  status: BookingStatus;
  listing: { name: string; slug: string; propertyName: string; image: ListingImage | null };
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  currency: string;
}

/** Busy nights as half-open ranges [start, end), ISO dates. */
export interface Availability {
  listingId: string;
  from: string;
  to: string;
  busy: { start: string; end: string }[];
  /** Check-ins on nights [start, end) need at least minNights (seasonal minimum stays). */
  rules: StayRule[];
}

export interface StayRule {
  start: string;
  end: string;
  minNights: number;
}

export interface Quote {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  currency: string;
  /** Before tax; they add up to subtotal. */
  lines: { label: string; amount: number }[];
  subtotal?: number;
  /** Added on top of the lines (GST), empty when the host doesn't charge tax. */
  taxes?: { label: string; amount: number }[] | null;
  /** What the guest pays. */
  total: number;
}

export interface CreateBookingInput {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  message: string;
}

/** A booking holding its dates while the guest pays. `token` is a secret bearer value. */
export interface BookingHold {
  token: string;
  reference: string;
  status: "pending_payment";
  holdExpiresAt: string;
}

export type BookingStatus = "pending_payment" | "confirmed" | "expired" | "cancelled";

export interface BookingSummary {
  reference: string;
  status: BookingStatus;
  listing: { name: string; slug: string; propertyName: string; image: ListingImage | null };
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmailMasked: string;
  quote: Quote;
  holdExpiresAt: string | null;
  payment: { status: "unpaid" | "paid"; method: PaymentMethod | null; paidAt: string | null; mode: "simulated" | "live" };
  paymentMethods: PaymentMethod[];
}

export interface PaymentInput {
  method: PaymentMethod;
}

/** `requires_action` + `redirectUrl` is how a real gateway (v0.3) hands off to its own page. */
export interface PaymentResult {
  status: "succeeded" | "requires_action" | "failed";
  redirectUrl?: string;
  message?: string;
}

/** Abuse signals the BFF has checked; forwarded so the backend can re-verify and rate-limit. */
export interface RequestContext {
  clientIp: string;
  userAgent: string;
  turnstileToken: string | null;
  idempotencyKey: string;
}

export class PmsError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
