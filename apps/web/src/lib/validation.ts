import { z } from "zod";
import { isIsoDate, nightsBetween } from "./dates";

// Shared by the request form (client) and the route handler (server). The server copy is the one
// that counts; the backend validates again.

const isoDate = z.string().refine(isIsoDate, "Invalid date");

export const stayQuery = z
  .object({
    listing: z.string().uuid(),
    checkIn: isoDate,
    checkOut: isoDate,
    guests: z.coerce.number().int().min(1).max(50),
  })
  .refine((v) => v.checkOut > v.checkIn, { message: "Check-out must be after check-in", path: ["checkOut"] })
  .refine((v) => nightsBetween(v.checkIn, v.checkOut) <= 60, { message: "Stays are limited to 60 nights", path: ["checkOut"] });

export const availabilityQuery = z
  .object({ listing: z.string().uuid(), from: isoDate, to: isoDate })
  .refine((v) => v.to > v.from && nightsBetween(v.from, v.to) <= 400, { message: "Invalid range" });

// Typed with or without +91, spaces, dashes or a leading 0 ("098450 12345"); a bare 10-digit number is Indian.
const phone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s()-]/g, "").replace(/^0(?=[6-9]\d{9}$)/, ""))
  .pipe(z.string().regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid mobile number"));

/** A mobile number to send a sign-in code to: Indian, as +91XXXXXXXXXX. */
const mobile = z
  .string()
  .trim()
  .max(24)
  .transform((s) => s.replace(/[\s()-]/g, "").replace(/^(?:\+91|0091|91(?=\d{10}$)|0)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"))
  .transform((s) => `+91${s}`);

const emailField = z.string().trim().toLowerCase().email("Enter a valid email").max(254);

const antiSpam = { website: z.string().max(0).optional(), turnstileToken: z.string().max(2048).nullable() };

/** A code by email, or by SMS to a mobile number. */
export const signInCodeBody = z.union([
  z.object({ email: emailField, ...antiSpam }).strict(),
  z.object({ mobile, ...antiSpam }).strict(),
]);

/** Name and phone arrive when the code is confirmed at checkout: they create the guest's account. */
const verifyDetails = {
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  name: z.string().trim().min(2).max(100).optional(),
};

export const signInVerifyBody = z.union([
  z.object({ email: emailField, ...verifyDetails, phone: phone.optional() }).strict(),
  // Phone sign-in at checkout: the email typed there is where confirmations go.
  z.object({ mobile, ...verifyDetails, contactEmail: emailField.optional() }).strict(),
]);

const csv = (v: unknown) => (typeof v === "string" && v ? v.split(",").filter(Boolean) : undefined);

/** /stays search params. Unknown or malformed values are dropped, never errors: it's a URL people share. */
export const searchParamsSchema = z.object({
  checkIn: z.string().refine(isIsoDate).optional().catch(undefined),
  checkOut: z.string().refine(isIsoDate).optional().catch(undefined),
  guests: z.coerce.number().int().min(1).max(50).optional().catch(undefined),
  minPrice: z.coerce.number().int().min(0).max(10_000_000).optional().catch(undefined),
  maxPrice: z.coerce.number().int().min(0).max(10_000_000).optional().catch(undefined),
  bedrooms: z.coerce.number().int().min(1).max(20).optional().catch(undefined),
  beds: z.coerce.number().int().min(1).max(30).optional().catch(undefined),
  bathrooms: z.coerce.number().int().min(1).max(20).optional().catch(undefined),
  instantBook: z.literal("true").transform(() => true).optional().catch(undefined),
  types: z.preprocess(csv, z.array(z.enum(["cottage", "suite", "villa", "home", "apartment"])).max(5)).optional().catch(undefined),
  amenities: z.preprocess(csv, z.array(z.string().max(40)).max(12)).optional().catch(undefined),
  city: z.string().max(60).optional().catch(undefined),
  sort: z.enum(["recommended", "price_asc", "price_desc"]).optional().catch(undefined),
  flex: z.coerce.number().int().min(1).max(3).optional().catch(undefined),
  stay: z.enum(["weekend", "week", "month"]).optional().catch(undefined),
  months: z.preprocess(csv, z.array(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)).max(6)).optional().catch(undefined),
  children: z.coerce.number().int().min(0).max(20).optional().catch(undefined),
  bounds: z
    .string()
    .regex(/^-?\d{1,3}(\.\d{1,6})?(,-?\d{1,3}(\.\d{1,6})?){3}$/)
    .optional()
    .catch(undefined),
});

/** Secret booking token from the PMS (base64url, 32 chars). */
export const bookingToken = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/);

export const reviewBody = z.object({ rating: z.number().int().min(1).max(5), text: z.string().trim().min(10).max(2000) }).strict();

export const changeDatesBody = z
  .object({ checkIn: isoDate, checkOut: isoDate })
  .strict()
  .refine((v) => v.checkOut > v.checkIn, { message: "Check-out must be after check-in", path: ["checkOut"] })
  .refine((v) => nightsBetween(v.checkIn, v.checkOut) <= 60, { message: "Stays are limited to 60 nights", path: ["checkOut"] });

export const paymentBody = z
  .object({
    method: z.enum(["upi", "card", "netbanking"]),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export const createBookingBody = z
  .object({
    listingId: z.string().uuid(),
    checkIn: isoDate,
    checkOut: isoDate,
    guests: z.number().int().min(1).max(50),
    name: z.string().trim().min(2, "Enter your full name").max(100),
    email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
    phone,
    message: z.string().trim().max(1000).default(""),
    // Anti-spam fields, never forwarded to the PMS.
    website: z.string().max(0).optional(), // honeypot: must stay empty
    elapsedMs: z.number().int().nonnegative(),
    // Signed-in guests passed Turnstile when they requested their email code.
    turnstileToken: z.string().max(2048).nullable().optional(),
    idempotencyKey: z.string().uuid(),
  })
  .strict()
  .refine((v) => v.checkOut > v.checkIn, { message: "Check-out must be after check-in", path: ["checkOut"] });

export type CreateBookingBody = z.infer<typeof createBookingBody>;
