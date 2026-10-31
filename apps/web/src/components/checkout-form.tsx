"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { GuestSession } from "@/lib/pms/types";
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
  /** The signed-in guest, if any. Bookings always belong to one. */
  session: GuestSession | null;
}

type Field = "name" | "email" | "phone" | "message" | "code" | "form";
type FieldErrors = Partial<Record<Field, string>>;
interface Details {
  name: string;
  email: string;
  phone: string;
  message: string;
}

// Step 1 of checkout. Booking needs a signed-in guest, and the details typed here are the account:
// a new guest confirms their email with a 6-digit code, which signs them in and saves their name
// and phone; a returning guest sees them prefilled. Then the booking holds the dates for payment.
export function CheckoutForm({ listingId, checkIn, checkOut, guests, holdMinutes, session }: Props) {
  const mountedAt = useRef(0);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // One key per form instance: a double click or a retry after a timeout cannot hold dates twice.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [details, setDetails] = useState<Details>({
    name: session?.name ?? "",
    email: session?.email ?? "",
    phone: session?.phone ?? "",
    message: "",
  });
  const [step, setStep] = useState<"details" | "code">("details");
  const [code, setCode] = useState("");
  const [testModeCode, setTestModeCode] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState<null | "code" | "verify" | "book">(null);

  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  const needsChallenge = !session && Boolean(TURNSTILE_SITE_KEY);

  function renderTurnstile() {
    if (!TURNSTILE_SITE_KEY || !widget.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(widget.current, {
      sitekey: TURNSTILE_SITE_KEY,
      action: "signin",
      appearance: "interaction-only",
      callback: (t: string) => setTurnstileToken(t),
      "expired-callback": () => setTurnstileToken(null),
      "error-callback": () => setTurnstileToken(null),
    });
  }

  const set = (field: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDetails((d) => ({ ...d, [field]: e.target.value }));

  function checkDetails(): FieldErrors {
    const found: FieldErrors = {};
    if (details.name.trim().length < 2) found.name = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(details.email.trim())) found.email = "Enter a valid email";
    if (!/^\+?[1-9]\d{7,14}$/.test(details.phone.replace(/[\s()-]/g, ""))) found.phone = "Enter a valid phone number with country code";
    return found;
  }

  async function book(): Promise<void> {
    setBusy("book");
    try {
      const website = (document.getElementById("website") as HTMLInputElement | null)?.value ?? "";
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          checkIn,
          checkOut,
          guests,
          ...details,
          website,
          elapsedMs: Math.round(performance.now() - mountedAt.current),
          idempotencyKey,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.ok && typeof body.token === "string") {
        // Full navigation so the header picks up a session started on this page.
        window.location.assign(`/checkout/${encodeURIComponent(body.token)}`);
        return;
      }
      if (res.status === 400 && body.fields) setErrors(body.fields);
      else if (res.status === 401) {
        setStep("details");
        setErrors({ form: "Your sign-in has expired. Confirm your email again to continue." });
      } else if (res.status === 409) setErrors({ form: "Sorry, those dates were just booked. Please choose other dates." });
      else if (res.status === 422) setErrors({ form: body.message ?? "These details don't match this stay." });
      else if (res.status === 429) setErrors({ form: "Too many attempts. Please wait a few minutes and try again." });
      else setErrors({ form: "Something went wrong on our side. Please try again, or contact us directly." });
    } catch {
      setErrors({ form: "Network problem. Please check your connection and try again." });
    }
    setBusy(null);
  }

  async function sendCode() {
    setBusy("code");
    const res = await fetch("/api/auth/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: details.email.trim(), website: "", turnstileToken }),
    }).catch(() => null);
    setBusy(null);
    window.turnstile?.reset(widgetId.current ?? undefined);
    setTurnstileToken(null);

    if (res?.status === 202) {
      const body = await res.json().catch(() => ({}));
      setTestModeCode(typeof body.testModeCode === "string" ? body.testModeCode : null);
      setCode("");
      setStep("code");
    } else if (res?.status === 429) setErrors({ form: "Too many attempts. Please wait a few minutes." });
    else if (res?.status === 400) setErrors({ email: "Enter a valid email" });
    else setErrors({ form: "We couldn't send a code just now. Please try again." });
  }

  async function onDetails(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const found = checkDetails();
    setErrors(found);
    if (Object.keys(found).length) return;
    if (session) await book();
    else await sendCode();
  }

  async function onCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErrors({});
    setBusy("verify");
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: details.email.trim(), code, name: details.name.trim(), phone: details.phone }),
    }).catch(() => null);
    if (!res?.ok) {
      setBusy(null);
      setErrors({ code: res?.status === 429 ? "Too many attempts. Request a new code in a few minutes." : "That code is invalid or has expired." });
      return;
    }
    await book();
  }

  const input =
    "mt-1.5 w-full rounded-lg border border-line bg-white px-4 py-3 text-base outline-none transition placeholder:text-ink-soft/70 focus:border-brand focus:ring-4 focus:ring-brand/10 read-only:bg-sand read-only:text-ink-soft";
  const error = (f: Field) =>
    errors[f] && (
      <p id={`${f}-error`} className="mt-1.5 text-sm text-red-700">
        {errors[f]}
      </p>
    );
  const formError = errors.form && (
    <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
      {errors.form}
    </p>
  );
  const primary =
    "group flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 font-medium text-white transition hover:brightness-110 disabled:opacity-50";

  if (step === "code") {
    return (
      <form onSubmit={onCode} noValidate className="space-y-5">
        <div>
          <h3 className="text-h3">Confirm your email</h3>
          <p className="mt-1 text-ink-soft">
            We sent a 6-digit code to <span className="text-ink">{details.email}</span>. It expires in 10 minutes. Confirming creates your
            account, so you can find this booking later.
          </p>
        </div>
        {testModeCode && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Test mode:</strong> emails aren’t sent yet. Your code is{" "}
            <span className="font-mono text-base tracking-widest">{testModeCode}</span>
          </p>
        )}
        <div>
          <label htmlFor="code" className="text-sm font-medium">
            Code
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            aria-invalid={Boolean(errors.code)}
            aria-describedby={errors.code ? "code-error" : undefined}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={`${input} text-center font-mono text-2xl tracking-[0.5em]`}
          />
          {error("code")}
        </div>
        {formError}
        <button type="submit" disabled={Boolean(busy) || code.length !== 6} className={primary}>
          {busy === "book" ? "Holding your dates…" : busy === "verify" ? "Checking…" : "Confirm and continue to payment"}
        </button>
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <button type="button" onClick={() => { setStep("details"); setErrors({}); }} className="min-h-11 underline underline-offset-4">
            Edit details
          </button>
          <button type="button" onClick={sendCode} disabled={Boolean(busy)} className="min-h-11 underline underline-offset-4">
            Resend code
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onDetails} noValidate className="space-y-5">
      {needsChallenge && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderTurnstile} />
      )}

      {session && (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Icon name="check" className="h-4 w-4 text-brand" /> Signed in as <span className="text-ink">{session.email}</span>
        </p>
      )}

      <div>
        <label htmlFor="name" className="text-sm font-medium">
          Full name
        </label>
        <input
          id="name"
          autoComplete="name"
          required
          maxLength={100}
          placeholder="As on your ID"
          value={details.name}
          onChange={set("name")}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
          className={input}
        />
        {error("name")}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@example.com"
            value={details.email}
            onChange={set("email")}
            readOnly={Boolean(session)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={input}
          />
          {error("email")}
        </div>
        <div>
          <label htmlFor="phone" className="text-sm font-medium">
            Mobile number
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            required
            maxLength={20}
            placeholder="+91 98xxx xxxxx"
            value={details.phone}
            onChange={set("phone")}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            className={input}
          />
          {error("phone")}
        </div>
      </div>

      <div>
        <label htmlFor="message" className="text-sm font-medium">
          Anything we should know? <span className="font-normal text-ink-soft">(optional)</span>
        </label>
        <textarea
          id="message"
          rows={3}
          maxLength={1000}
          placeholder="Arrival time, special occasions, dietary needs…"
          value={details.message}
          onChange={set("message")}
          className={input}
        />
        {error("message")}
      </div>

      {/* Honeypot: hidden from people and screen readers, irresistible to form-filling bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {needsChallenge && <div ref={widget} />}
      {formError}

      <button type="submit" disabled={Boolean(busy) || (needsChallenge && !turnstileToken)} className={primary}>
        {busy === "book" ? "Holding your dates…" : busy === "code" ? "Sending code…" : session ? "Continue to payment" : "Continue"}
        {!busy && <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-center text-sm text-ink-soft">
        <Icon name="lock" className="h-3.5 w-3.5" />
        {session
          ? `Your dates are held for ${holdMinutes} minutes while you pay.`
          : "Next, we’ll email you a code to confirm it’s you. That creates your account."}
      </p>
    </form>
  );
}
