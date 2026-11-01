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

const phone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number with country code"));

const emailField = z.string().trim().toLowerCase().email("Enter a valid email").max(254);

export const signInCodeBody = z
  .object({ email: emailField, website: z.string().max(0).optional(), turnstileToken: z.string().max(2048).nullable() })
  .strict();

/** Name and phone arrive when the code is confirmed at checkout: they create the guest's account. */
export const signInVerifyBody = z
  .object({
    email: emailField,
    code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
    name: z.string().trim().min(2).max(100).optional(),
    phone: phone.optional(),
  })
  .strict();

const csv = (v: unknown) => (typeof v === "string" && v ? v.split(",").filter(Boolean) : undefined);

/** /stays search params. Unknown or malformed values are dropped, never errors: it's a URL people share. */
export const searchParamsSchema = z.object({
  checkIn: z.string().refine(isIsoDate).optional().catch(undefined),
  checkOut: z.string().refine(isIsoDate).optional().catch(undefined),
  guests: z.coerce.number().int().min(1).max(50).optional().catch(undefined),
  minPrice: z.coerce.number().int().min(0).max(10_000_000).optional().catch(undefined),
  maxPrice: z.coerce.number().int().min(0).max(10_000_000).optional().catch(undefined),
  bedrooms: z.coerce.number().int().min(1).max(20).optional().catch(undefined),
  types: z.preprocess(csv, z.array(z.enum(["cottage", "suite", "villa", "home", "apartment"])).max(5)).optional().catch(undefined),
  amenities: z.preprocess(csv, z.array(z.string().max(40)).max(12)).optional().catch(undefined),
  city: z.string().max(60).optional().catch(undefined),
  sort: z.enum(["recommended", "price_asc", "price_desc"]).optional().catch(undefined),
});

/** Secret booking token from the PMS (base64url, 32 chars). */
export const bookingToken = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/);

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
