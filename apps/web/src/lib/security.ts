import "server-only";
import type { NextRequest } from "next/server";

// BFF-side abuse checks. These are the cheap first layers; the backend re-verifies Turnstile and
// owns the authoritative rate limits (docs/ARCHITECTURE.md §5).

/** Real client IP as set by the hosting proxy (Vercel / Cloudflare / nginx). */
export function clientIp(request: NextRequest): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/** CSRF defence for JSON POSTs: the request must come from a page on the same host. */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Fixed-window limiter per instance. Not shared across instances; it only blunts floods before
// they cost a backend round trip.
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(bucket: string, id: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const key = `${bucket}:${id}`;
  const entry = windows.get(key);
  if (!entry || entry.resetAt <= now) {
    if (windows.size > 10_000) {
      for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

const TURNSTILE_VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Verifies a Turnstile token. Fails closed in production when the secret is missing. */
export async function verifyTurnstile(token: string | null, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!token || token.length > 2048) return false;

  try {
    const res = await fetch(TURNSTILE_VERIFY, {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

/** Throwaway inbox domains: requests from these never reach the host. Extended from the PMS later. */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "sharklasers.com",
  "dispostable.com",
  "maildrop.cc",
  "throwawaymail.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && DISPOSABLE_DOMAINS.has(domain);
}
