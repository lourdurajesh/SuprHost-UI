"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface Props {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  holdMinutes: number;
}

type FieldErrors = Partial<Record<"name" | "email" | "phone" | "message" | "form", string>>;

// Step 1 of checkout: guest details. Creates a booking that holds the dates, then moves to payment.
export function CheckoutForm({ listingId, checkIn, checkOut, guests, holdMinutes }: Props) {
  const router = useRouter();
  const mountedAt = useRef(0);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // One key per form instance: a double click or a retry after a timeout cannot hold dates twice.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [token, setToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  function renderTurnstile() {
    if (!TURNSTILE_SITE_KEY || !widget.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(widget.current, {
      sitekey: TURNSTILE_SITE_KEY,
      action: "booking",
      appearance: "interaction-only",
      callback: (t: string) => setToken(t),
      "expired-callback": () => setToken(null),
      "error-callback": () => setToken(null),
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const data = new FormData(e.currentTarget);
    setSubmitting(true);
    setErrors({});

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          checkIn,
          checkOut,
          guests,
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          message: data.get("message") ?? "",
          website: data.get("website") ?? "",
          elapsedMs: Math.round(performance.now() - mountedAt.current),
          turnstileToken: token,
          idempotencyKey,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.ok && typeof body.token === "string") {
        router.push(`/checkout/${encodeURIComponent(body.token)}`);
        return;
      }
      if (res.status === 400 && body.fields) setErrors(body.fields);
      else if (res.status === 409) setErrors({ form: "Sorry, those dates were just booked. Please choose other dates." });
      else if (res.status === 422) setErrors({ form: body.message ?? "These details don't match this stay." });
      else if (res.status === 429) setErrors({ form: "Too many attempts. Please wait a few minutes and try again." });
      else if (res.status === 403) setErrors({ form: "We could not verify this request. Please try again." });
      else setErrors({ form: "Something went wrong on our side. Please try again, or contact us directly." });

      window.turnstile?.reset(widgetId.current ?? undefined);
      setToken(null);
    } catch {
      setErrors({ form: "Network problem. Please check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const input =
    "mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-base outline-none transition placeholder:text-ink-soft/60 focus:border-brand focus:ring-4 focus:ring-brand/10";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {TURNSTILE_SITE_KEY && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderTurnstile} />
      )}

      <div>
        <label htmlFor="name" className="text-sm font-medium">
          Full name
        </label>
        <input id="name" name="name" autoComplete="name" required maxLength={100} placeholder="As on your ID" className={input} />
        {errors.name && <p className="mt-1.5 text-sm text-red-700">{errors.name}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" className={input} />
          {errors.email && <p className="mt-1.5 text-sm text-red-700">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="phone" className="text-sm font-medium">
            Mobile number
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" required placeholder="+91 98xxx xxxxx" maxLength={20} className={input} />
          {errors.phone && <p className="mt-1.5 text-sm text-red-700">{errors.phone}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="message" className="text-sm font-medium">
          Anything we should know? <span className="font-normal text-ink-soft">(optional)</span>
        </label>
        <textarea id="message" name="message" rows={3} maxLength={1000} placeholder="Arrival time, special occasions, dietary needs…" className={input} />
        {errors.message && <p className="mt-1.5 text-sm text-red-700">{errors.message}</p>}
      </div>

      {/* Honeypot: hidden from people and screen readers, irresistible to form-filling bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div ref={widget} />

      {errors.form && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {errors.form}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || (Boolean(TURNSTILE_SITE_KEY) && !token)}
        className="group flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-4 font-medium text-white shadow-lg shadow-brand/20 transition hover:brightness-110 disabled:opacity-50"
      >
        {submitting ? "Holding your dates…" : "Continue to payment"}
        {!submitting && <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink-soft">
        <Icon name="lock" className="h-3.5 w-3.5" /> Your dates are held for {holdMinutes} minutes while you pay.
      </p>
    </form>
  );
}
