import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type {
  Availability,
  BookingHold,
  BookingSummary,
  CreateBookingInput,
  Listing,
  ListingImage,
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
import { addDays, nightsBetween, overlapsBusy, toIso } from "@/lib/dates";

// Development stand-in for the PMS public API. Used only when PMS_API_URL is not set and never
// in production (see ./index.ts). Bookings live in process memory and vanish on restart.

const img = (name: string, alt: string): ListingImage => ({ url: `/demo/${name}.svg`, alt, width: 1200, height: 900 });
// Free stock photos from Pexels (see public/stock/CREDITS.md), standing in for real property photos.
const photo = (id: number, alt: string, width: number, height: number): ListingImage => ({ url: `/stock/pexels-${id}.jpg`, alt, width, height });

const site: Site = {
  key: "demo",
  canonicalUrl: "http://localhost:3000",
  brandName: "Kaveri Stays",
  tagline: "Riverside homes, made for slow mornings.",
  intro: "Hand-kept cottages and a heritage family home on the banks of the Kaveri, forty minutes from Mysuru.",
  statement:
    "We look after every stay ourselves, from your first message to the morning you leave. Clean rooms, a warm welcome and a host who picks up the phone come first.",
  logoUrl: null,
  heroImage: photo(5531364, "Thatched cottages on a riverbank", 1600, 1067),
  theme: "escape",
  colors: { primary: "#3D3A3A", accent: "#4E8E82" },
  about: {
    title: "A family place, run by family",
    body:
      "We restored our grandparents' riverside land in 2019 and opened the first cottage a year later. Every stay is looked after by us and the same small team from the village: filter coffee at sunrise, a cook on request, and local tips you won't find in a guidebook.",
    image: photo(14024795, "Villas and pool among palm trees", 1600, 1067),
  },
  highlights: [
    { icon: "leaf", title: "On the riverbank", text: "Wake up to birdsong and the sound of water." },
    { icon: "wallet", title: "Best price, direct", text: "No platform fees. Always lower than travel sites." },
    { icon: "chat", title: "A real host", text: "Message or call us any time before and during your stay." },
    { icon: "shield", title: "Secure booking", text: "Instant confirmation and a clear cancellation policy." },
  ],
  testimonials: [
    {
      quote: "The most peaceful three days we've had in years. The breakfast on the verandah was unforgettable.",
      author: "Ananya R.",
      from: "Bengaluru",
      stay: "River Cottage",
    },
    {
      quote: "Perfect for our family of seven. The courtyard house felt like visiting grandparents, in the best way.",
      author: "Rahul & Meera",
      from: "Chennai",
      stay: "Family House",
    },
    {
      quote: "Booked direct, got a better price and the host sorted a cab from Mysuru for us. Will be back.",
      author: "Sophie L.",
      from: "London",
      stay: "Garden Suite",
    },
  ],
  faqs: [
    { q: "How do I get there?", a: "We are 40 minutes from Mysuru and 3 hours from Bengaluru by road. We can arrange a cab from Mysuru station or airport." },
    { q: "Is breakfast included?", a: "Breakfast is available at ₹350 per guest per day. Our cook can also prepare lunch and dinner on request." },
    { q: "Can I bring my pet?", a: "Well-behaved pets are welcome in River Cottage on request. Please mention it in your booking." },
    { q: "When do I pay?", a: "You pay securely when you book, and your dates are confirmed instantly." },
  ],
  contact: {
    email: "stay@example.com",
    phone: "+91 98400 00000",
    whatsapp: "+919840000000",
    address: "Ganjam Road, Srirangapatna, Karnataka 571438",
  },
  location: { lat: 12.4244, lng: 76.682, label: "Srirangapatna, near Mysuru" },
  policies: {
    checkInTime: "13:00",
    checkOutTime: "11:00",
    cancellation: "Free cancellation up to 7 days before check-in. After that, the first night is non-refundable.",
    houseRules: ["No smoking indoors", "No parties or events", "Quiet hours 22:00 – 07:00"],
  },
  seo: {
    title: "Kaveri Stays — riverside homestays near Mysuru",
    description: "Book riverside cottages and a heritage family home directly with the host. Best rates, instant confirmation.",
  },
  currency: "INR",
  timezone: "Asia/Kolkata",
  payments: { mode: "simulated", methods: ["upi", "card", "netbanking"], holdMinutes: 15 },
  features: ["website.public", "website.instant_book"],
  pricesAddGst: false,
};

const listings: Listing[] = [
  {
    id: "7d2f0c1e-0000-4000-8000-000000000001",
    slug: "river-cottage",
    name: "River Cottage",
    propertyType: "cottage",
    instantBook: true,
    tagline: "Two bedrooms and a verandah on the water",
    propertyName: "Kaveri Riverside",
    city: "Srirangapatna",
    maxGuests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 2,
    fromPrice: 4500,
    image: img("cottage", "River Cottage from the garden"),
    images: [
      img("cottage", "River Cottage from the garden"),
      img("river-dawn", "The river at sunrise from the verandah"),
      img("verandah", "Verandah with cane chairs"),
      img("garden", "The garden running down to the water"),
      img("sunset", "Sunset over the river"),
    ],
    description:
      "A two-bedroom cottage on the riverbank with a wide verandah, a kitchenette and a garden that runs down to the water.\n\nMornings are for birdsong and filter coffee; evenings for the sunset over the river. Both bedrooms have queen beds, air conditioning and their own bathroom.",
    highlights: [
      { icon: "water", title: "Riverfront", text: "Steps from the water's edge." },
      { icon: "home", title: "Entire cottage", text: "The whole place is yours." },
      { icon: "calendar", title: "Free cancellation", text: "Up to 7 days before check-in." },
    ],
    amenities: ["Wi-Fi", "Air conditioning", "Kitchenette", "Free parking", "Garden", "Hot water", "Power backup", "Breakfast available"],
    houseRules: ["Pets on request"],
    location: { lat: 12.4244, lng: 76.682 },
    minNights: 1,
    maxNights: 30,
  },
  {
    id: "7d2f0c1e-0000-4000-8000-000000000002",
    slug: "garden-suite",
    name: "Garden Suite",
    propertyType: "suite",
    instantBook: true,
    tagline: "A private suite for two in the mango orchard",
    propertyName: "Kaveri Riverside",
    city: "Srirangapatna",
    maxGuests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    fromPrice: 2800,
    image: img("garden", "Garden Suite among the mango trees"),
    images: [
      img("garden", "Garden Suite among the mango trees"),
      img("verandah", "Reading nook"),
      img("hills", "Morning view"),
    ],
    description:
      "A private suite for two opening onto the mango orchard, with a four-poster bed, a reading nook and an outdoor rain shower.",
    highlights: [
      { icon: "leaf", title: "Orchard setting", text: "Surrounded by mango trees." },
      { icon: "shower", title: "Outdoor shower", text: "Private rain shower under the sky." },
      { icon: "calendar", title: "Free cancellation", text: "Up to 7 days before check-in." },
    ],
    amenities: ["Wi-Fi", "Air conditioning", "Breakfast available", "Free parking", "Outdoor shower", "Hot water"],
    houseRules: ["Not suitable for children under 12"],
    location: { lat: 12.4244, lng: 76.682 },
    minNights: 1,
    maxNights: 14,
  },
  {
    id: "7d2f0c1e-0000-4000-8000-000000000003",
    slug: "family-house",
    name: "Family House",
    propertyType: "home",
    instantBook: true,
    tagline: "A restored 1940s home around a courtyard",
    propertyName: "Kaveri Heritage Home",
    city: "Mysuru",
    maxGuests: 8,
    bedrooms: 4,
    beds: 5,
    bathrooms: 3,
    fromPrice: 9500,
    image: img("courtyard", "The central courtyard of the Family House"),
    images: [
      img("courtyard", "The central courtyard"),
      img("cottage", "Front of the house"),
      img("sunset", "Evening from the terrace"),
      img("garden", "Back garden"),
    ],
    description:
      "A restored 1940s family home with four bedrooms around a central courtyard, a full kitchen and a caretaker on site. Ten minutes from Mysuru Palace.",
    highlights: [
      { icon: "users", title: "Room for eight", text: "Four bedrooms, three bathrooms." },
      { icon: "home", title: "Caretaker on site", text: "Help with anything, day or night." },
      { icon: "pin", title: "Near the palace", text: "Ten minutes to Mysuru Palace." },
    ],
    amenities: ["Wi-Fi", "Air conditioning", "Full kitchen", "Caretaker", "Washing machine", "Free parking", "Courtyard", "Power backup"],
    houseRules: [],
    location: { lat: 12.3052, lng: 76.6552 },
    minNights: 2,
    maxNights: 30,
  },
  {
    id: "7d2f0c1e-0000-4000-8000-000000000004",
    slug: "coffee-estate-bungalow",
    name: "Coffee Estate Bungalow",
    propertyType: "villa",
    instantBook: true,
    tagline: "A colonial bungalow inside a working coffee estate",
    propertyName: "Kaveri Hill Collection",
    city: "Madikeri",
    maxGuests: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 3,
    fromPrice: 7800,
    image: img("hills", "Coffee Estate Bungalow"),
    images: [img("hills", "Coffee Estate Bungalow"), img("verandah", "Coffee Estate Bungalow — verandah"), img("garden", "Coffee Estate Bungalow — garden"), img("sunset", "Coffee Estate Bungalow — sunset")],
    description: "A colonial bungalow inside a working coffee estate. Looked after by the Kaveri Stays team, with a local caretaker on call and everything you need for a slow, comfortable stay.",
    highlights: [
      { icon: "home", title: "Entire villa", text: "The whole place is yours." },
      { icon: "pin", title: "Madikeri", text: "Easy to reach, quiet once you're there." },
      { icon: "calendar", title: "Free cancellation", text: "Up to 7 days before check-in." },
    ],
    amenities: ["Wi-Fi","Full kitchen","Free parking","Garden","Caretaker","Hot water","Breakfast available"],
    houseRules: [],
    location: { lat: 12.4208, lng: 75.7397 },
    minNights: 1,
    maxNights: 30,
  },
  {
    id: "7d2f0c1e-0000-4000-8000-000000000005",
    slug: "hilltop-villa",
    name: "Hilltop Villa",
    propertyType: "villa",
    instantBook: false,
    tagline: "Five bedrooms above the clouds, with a fireplace",
    propertyName: "Kaveri Hill Collection",
    city: "Ooty",
    maxGuests: 10,
    bedrooms: 5,
    beds: 6,
    bathrooms: 5,
    fromPrice: 14500,
    image: img("sunset", "Hilltop Villa"),
    images: [img("sunset", "Hilltop Villa"), img("hills", "Hilltop Villa — hills"), img("verandah", "Hilltop Villa — verandah"), img("garden", "Hilltop Villa — garden")],
    description: "Five bedrooms above the clouds, with a fireplace. Looked after by the Kaveri Stays team, with a local caretaker on call and everything you need for a slow, comfortable stay.",
    highlights: [
      { icon: "home", title: "Entire villa", text: "The whole place is yours." },
      { icon: "pin", title: "Ooty", text: "Easy to reach, quiet once you're there." },
      { icon: "calendar", title: "Free cancellation", text: "Up to 7 days before check-in." },
    ],
    amenities: ["Wi-Fi","Full kitchen","Free parking","Garden","Caretaker","Washing machine","Power backup","Hot water"],
    houseRules: [],
    location: { lat: 11.4102, lng: 76.695 },
    minNights: 2,
    maxNights: 30,
  },
  {
    id: "7d2f0c1e-0000-4000-8000-000000000006",
    slug: "lakeview-apartment",
    name: "Lakeview Apartment",
    propertyType: "apartment",
    instantBook: true,
    tagline: "A bright city flat facing Kukkarahalli lake",
    propertyName: "Kaveri City Homes",
    city: "Mysuru",
    maxGuests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    fromPrice: 3200,
    image: img("river-dawn", "Lakeview Apartment"),
    images: [img("river-dawn", "Lakeview Apartment"), img("verandah", "Lakeview Apartment — verandah"), img("courtyard", "Lakeview Apartment — courtyard")],
    description: "A bright city flat facing Kukkarahalli lake. Looked after by the Kaveri Stays team, with a local caretaker on call and everything you need for a slow, comfortable stay.",
    highlights: [
      { icon: "home", title: "Entire apartment", text: "The whole place is yours." },
      { icon: "pin", title: "Mysuru", text: "Easy to reach, quiet once you're there." },
      { icon: "calendar", title: "Free cancellation", text: "Up to 7 days before check-in." },
    ],
    amenities: ["Wi-Fi","Air conditioning","Kitchenette","Washing machine","Hot water","Power backup"],
    houseRules: [],
    location: { lat: 12.3133, lng: 76.6286 },
    minNights: 1,
    maxNights: 30,
  },
  {
    id: "7d2f0c1e-0000-4000-8000-000000000007",
    slug: "forest-cabin",
    name: "Forest Cabin",
    propertyType: "cottage",
    instantBook: true,
    tagline: "A timber cabin for two at the edge of the forest",
    propertyName: "Kaveri Hill Collection",
    city: "Wayanad",
    maxGuests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    fromPrice: 3900,
    image: img("garden", "Forest Cabin"),
    images: [img("garden", "Forest Cabin"), img("hills", "Forest Cabin — hills"), img("river-dawn", "Forest Cabin — river dawn")],
    description: "A timber cabin for two at the edge of the forest. Looked after by the Kaveri Stays team, with a local caretaker on call and everything you need for a slow, comfortable stay.",
    highlights: [
      { icon: "home", title: "Entire cottage", text: "The whole place is yours." },
      { icon: "pin", title: "Wayanad", text: "Easy to reach, quiet once you're there." },
      { icon: "calendar", title: "Free cancellation", text: "Up to 7 days before check-in." },
    ],
    amenities: ["Wi-Fi","Free parking","Hot water","Breakfast available","Outdoor shower"],
    houseRules: [],
    location: { lat: 11.6854, lng: 76.132 },
    minNights: 1,
    maxNights: 30,
  },
  {
    id: "7d2f0c1e-0000-4000-8000-000000000008",
    slug: "plantation-suite",
    name: "Plantation Suite",
    propertyType: "suite",
    instantBook: true,
    tagline: "A quiet suite among the pepper vines",
    propertyName: "Kaveri Hill Collection",
    city: "Chikmagalur",
    maxGuests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    fromPrice: 3600,
    image: img("verandah", "Plantation Suite"),
    images: [img("verandah", "Plantation Suite"), img("garden", "Plantation Suite — garden"), img("hills", "Plantation Suite — hills")],
    description: "A quiet suite among the pepper vines. Looked after by the Kaveri Stays team, with a local caretaker on call and everything you need for a slow, comfortable stay.",
    highlights: [
      { icon: "home", title: "Entire suite", text: "The whole place is yours." },
      { icon: "pin", title: "Chikmagalur", text: "Easy to reach, quiet once you're there." },
      { icon: "calendar", title: "Free cancellation", text: "Up to 7 days before check-in." },
    ],
    amenities: ["Wi-Fi","Air conditioning","Free parking","Breakfast available","Hot water"],
    houseRules: [],
    location: { lat: 13.3161, lng: 75.772 },
    minNights: 1,
    maxNights: 30,
  },
  {
    id: "7d2f0c1e-0000-4000-8000-000000000009",
    slug: "riverside-family-villa",
    name: "Riverside Family Villa",
    propertyType: "villa",
    instantBook: true,
    tagline: "Four bedrooms, a lawn and a private river deck",
    propertyName: "Kaveri Riverside",
    city: "Srirangapatna",
    maxGuests: 8,
    bedrooms: 4,
    beds: 5,
    bathrooms: 4,
    fromPrice: 12000,
    image: img("river-dawn", "Riverside Family Villa"),
    images: [img("river-dawn", "Riverside Family Villa"), img("cottage", "Riverside Family Villa — cottage"), img("sunset", "Riverside Family Villa — sunset"), img("garden", "Riverside Family Villa — garden")],
    description: "Four bedrooms, a lawn and a private river deck. Looked after by the Kaveri Stays team, with a local caretaker on call and everything you need for a slow, comfortable stay.",
    highlights: [
      { icon: "home", title: "Entire villa", text: "The whole place is yours." },
      { icon: "pin", title: "Srirangapatna", text: "Easy to reach, quiet once you're there." },
      { icon: "calendar", title: "Free cancellation", text: "Up to 7 days before check-in." },
    ],
    amenities: ["Wi-Fi","Air conditioning","Full kitchen","Free parking","Garden","Caretaker","Power backup","Hot water"],
    houseRules: [],
    location: { lat: 12.4287, lng: 76.6905 },
    minNights: 2,
    maxNights: 30,
  },
];

const PHOTOS: Record<string, ListingImage[]> = {
  "river-cottage": [photo(26743268, "Thatched cottage among palms", 1600, 1006), photo(14025910, "Bedroom with wooden furniture and a canopy bed", 1600, 1067), photo(7601101, "Garden patio with cushioned seating", 1600, 1067), photo(28975097, "The river at sunrise", 1600, 1067), photo(13036800, "Rustic kitchen", 1600, 1067)],
  "garden-suite": [photo(37510953, "The suite in its garden", 1600, 1200), photo(11757061, "Softly lit bedroom", 1600, 1077), photo(6908370, "Bathroom with timber vanity", 1600, 1067)],
  "family-house": [photo(33536851, "Traditional house with a tiled roof and wooden balcony", 1600, 1067), photo(8584020, "Living room with brick fireplace", 1600, 1067), photo(14596477, "Kitchen with vintage stove", 1600, 900)],
  "coffee-estate-bungalow": [photo(6635618, "Wooden bungalow in lush greenery", 1600, 1067), photo(3848200, "Green valley and hills around the estate", 1600, 1067), photo(15794320, "Stone-walled living room", 1600, 1067), photo(7125409, "Coffee berries ripening on the estate", 1600, 1067)],
  "hilltop-villa": [photo(30196347, "Villa with a forest garden", 1600, 900), photo(5382032, "Cottage on a green mountainside", 1600, 1067), photo(7027771, "Living room with fireplace", 1600, 1067), photo(6957081, "Bathroom with round tub", 1600, 1068)],
  "lakeview-apartment": [photo(19916712, "Bright living room with plants", 1600, 1067), photo(7836571, "Modern living area", 1600, 1067), photo(6394607, "Bedroom with armchairs", 1600, 1068)],
  "forest-cabin": [photo(281516, "Rustic cabin with moss-covered roof", 1600, 1317), photo(30260593, "Wooden cabin in tropical foliage", 1600, 1067), photo(2058752, "Sunlight through bamboo walls", 1600, 1067)],
  "plantation-suite": [photo(32026189, "Cottage surrounded by greenery", 1600, 1067), photo(36285704, "Warm, inviting bedroom", 1600, 1067), photo(38164975, "Patio with countryside view", 1600, 1599)],
  "riverside-family-villa": [photo(2476632, "Villa with private pool", 1600, 1067), photo(28054849, "Stone villa and infinity pool at dusk", 1600, 1067), photo(9890203, "Patio with hot tub", 1600, 1067), photo(16056400, "Living room with blue accents", 1600, 900)],
};
for (const l of listings) {
  const set = PHOTOS[l.slug];
  if (set) {
    l.images = set;
    l.image = set[0];
  }
}

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

  search: async (key: string, q: SearchQuery): Promise<SearchResult> => {
    if (key !== site.key) return { hits: [], facets: { types: [], cities: [], amenities: [], price: { min: 0, max: 0 } } };
    const dated = q.checkIn && q.checkOut && q.checkOut > q.checkIn;
    const nights = dated ? nightsBetween(q.checkIn!, q.checkOut!) : null;
    let hits: SearchHit[] = listings.map((l) => {
      const summary = toSummary(l);
      const busy = [...seededBusy(summary.id, today()), ...heldRanges(summary.id)];
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

  verifyCode: async (key: string, email: string, code: string, details: { name?: string; phone?: string } = {}): Promise<SessionGrant> => {
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
