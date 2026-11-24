"use client";

import { useEffect, useRef, useState } from "react";
import type { GuestSession } from "@/lib/pms/types";
import { requestCode, verifyCode } from "@/lib/auth-client";
import { maskMobile, toMobile } from "@/lib/mobile";
import { Icon } from "./icons";
import { MobileField } from "./mobile-field";
import { CodeInput, Honeypot, honeypotValue, TestModeCode } from "./sign-in-code";
import { TurnstileWidget, useTurnstile } from "./turnstile";
import { buttonClass, fieldClass, textButton } from "./ui/button";

interface Props {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  holdMinutes: number;
  /** The signed-in guest, if any. Bookings always belong to one. */
  session: GuestSession | null;
  /** The PMS can send SMS codes: new guests confirm their mobile number instead of their email. */
  phoneSignIn?: boolean;
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
// a new guest confirms their mobile number (SMS code) or their email (email code), which signs them
// in and saves their details; a returning guest sees them prefilled. Then the booking holds the
// dates for payment.
export function CheckoutForm({ listingId, checkIn, checkOut, guests, holdMinutes, session, phoneSignIn = false }: Props) {
  const signedInByPhone = session?.signedInWith === "phone";
  const mountedAt = useRef(0);
  // One key per form instance: a double click or a retry after a timeout cannot hold dates twice.
  // Per stay: the dates or guests can be changed on this page, and that is a different hold.
  const keys = useRef(new Map<string, string>());
  const [details, setDetails] = useState<Details>({
    name: session?.name ?? "",
    email: session?.email ?? "",
    // A verified number shows as the 10 digits after the fixed +91.
    phone: (signedInByPhone ? session?.phone?.replace(/^\+91/, "") : session?.phone) ?? "",
    message: "",
  });
  const [step, setStep] = useState<"details" | "code">("details");
  // How a new guest confirms who they are. Fixed once signed in.
  const [method, setMethod] = useState<"phone" | "email">(signedInByPhone || (!session && phoneSignIn) ? "phone" : "email");
  const mobileMode = method === "phone";
  const [code, setCode] = useState("");
  const [testModeCode, setTestModeCode] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState<null | "code" | "verify" | "book">(null);

  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  const check = useTurnstile(!session);

  const set = (field: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDetails((d) => ({ ...d, [field]: e.target.value }));

  function checkDetails(): FieldErrors {
    const found: FieldErrors = {};
    if (details.name.trim().length < 2) found.name = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(details.email.trim())) found.email = "Enter a valid email";
    if (mobileMode ? toMobile(details.phone) === null : !/^\+?[1-9]\d{7,14}$/.test(details.phone.replace(/[\s()-]/g, "").replace(/^0(?=[6-9]\d{9}$)/, "")))
      found.phone = mobileMode ? "Enter a valid 10-digit mobile number" : "Enter a valid mobile number";
    return found;
  }

  // Moves focus to the first field with an error (after it renders), so a failed submit is never
  // silent when the field has scrolled out of view, and screen readers announce the message.
  function showErrors(found: FieldErrors) {
    setErrors(found);
    const first = (["name", "email", "phone", "message", "code"] as const).find((f) => found[f]);
    if (first) requestAnimationFrame(() => document.getElementById(first)?.focus());
  }

  async function book(): Promise<void> {
    setBusy("book");
    try {
      const website = honeypotValue("website");
      const stay = `${checkIn}|${checkOut}|${guests}`;
      const idempotencyKey = keys.current.get(stay) ?? crypto.randomUUID();
      keys.current.set(stay, idempotencyKey);
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          checkIn,
          checkOut,
          guests,
          ...details,
          phone: mobileMode ? (toMobile(details.phone) ?? details.phone) : details.phone,
          website,
          elapsedMs: Math.round(performance.now() - mountedAt.current),
          idempotencyKey,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.ok && typeof body.token === "string") {
        // Full navigation so the header picks up a session started on this page.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`/checkout/${encodeURIComponent(body.token)}`);
        return;
      }
      if (res.status === 400 && body.fields) showErrors(body.fields);
      else if (res.status === 401) {
        setStep("details");
        setErrors({ form: `Your sign-in has expired. Confirm your ${mobileMode ? "mobile number" : "email"} again to continue.` });
      } else if (res.status === 409) setErrors({ form: "Sorry, those dates were just booked. Please choose other dates." });
      else if (res.status === 422) setErrors({ form: body.message ?? "These details don't match this stay." });
      else if (res.status === 429) setErrors({ form: "Too many attempts. Please wait a few minutes and try again." });
      else setErrors({ form: "Something went wrong on our side. Please try again, or contact us directly." });
    } catch {
      setErrors({ form: "Network problem. Please check your connection and try again." });
    }
    setBusy(null);
  }

  async function sendCode(by: "phone" | "email" = method) {
    setBusy("code");
    setMethod(by);
    const login = by === "phone" ? { mobile: toMobile(details.phone) ?? "" } : { email: details.email.trim() };
    const sent = await requestCode(login, { website: honeypotValue("website"), turnstileToken: check.take() });
    setBusy(null);
    if (sent.sent) {
      setTestModeCode(sent.testModeCode);
      setCode("");
      setErrors({});
      setStep("code");
    } else if (sent.invalid) setErrors(by === "phone" ? { phone: sent.message } : { email: sent.message });
    else setErrors({ form: sent.message });
  }

  async function onDetails(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const found = checkDetails();
    showErrors(found);
    if (Object.keys(found).length) return;
    if (session) await book();
    else await sendCode();
  }

  async function onCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErrors({});
    setBusy("verify");
    const name = details.name.trim();
    const email = details.email.trim();
    const problem = mobileMode
      ? await verifyCode({ mobile: toMobile(details.phone) ?? "" }, code, { name, contactEmail: email })
      : await verifyCode({ email }, code, { name, phone: details.phone });
    if (problem) {
      setBusy(null);
      setErrors({ code: problem });
      return;
    }
    await book();
  }

  const input = `${fieldClass} mt-1.5`;
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
  const next = `${buttonClass("dark")} max-sm:w-full`;

  if (step === "code") {
    return (
      <form onSubmit={onCode} noValidate className="space-y-5">
        <div>
          <h3 className="text-h3">{mobileMode ? "Confirm your mobile number" : "Confirm your email"}</h3>
          <p className="mt-1 text-ink-soft">
            We sent a 6-digit code {mobileMode ? "by SMS " : ""}to{" "}
            <span className="text-ink">{mobileMode ? maskMobile(toMobile(details.phone) ?? "") : details.email}</span>. It expires in 10
            minutes. Confirming creates your account, so you can find this booking later.
          </p>
        </div>
        <TestModeCode code={testModeCode} byPhone={mobileMode} />
        <CodeInput id="code" value={code} onChange={setCode} error={errors.code} />
        {formError}
        <div className="flex justify-end">
          <button type="submit" disabled={Boolean(busy) || code.length !== 6} className={next}>
            {busy === "book" ? "Holding your dates…" : busy === "verify" ? "Checking…" : "Next"}
          </button>
        </div>
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <button type="button" onClick={() => { setStep("details"); setErrors({}); }} className={textButton}>
            Edit details
          </button>
          <button type="button" onClick={() => sendCode()} disabled={Boolean(busy)} className={textButton}>
            Resend code
          </button>
        </div>
        <TurnstileWidget check={check} />
        {mobileMode && (
          <p className="text-center text-sm text-ink-soft">
            No SMS?{" "}
            <button type="button" onClick={() => sendCode("email")} disabled={Boolean(busy)} className={`${textButton} text-ink`}>
              Get the code by email instead
            </button>
          </p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={onDetails} noValidate className="space-y-5">
      {session && (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Icon name="check" className="h-4 w-4 text-brand" /> Signed in as{" "}
          <span className="text-ink">{signedInByPhone ? maskMobile(session.phone ?? "") : session.email}</span>
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
            readOnly={Boolean(session) && !signedInByPhone}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={input}
          />
          {error("email")}
        </div>
        {mobileMode ? (
          <MobileField
            id="phone"
            value={details.phone}
            onChange={(v) => setDetails((d) => ({ ...d, phone: v }))}
            readOnly={signedInByPhone}
            error={errors.phone}
          />
        ) : (
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
        )}
      </div>
      <p className="-mt-2 text-sm text-ink-soft">The host uses your mobile number to reach you about this stay.</p>

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

      <Honeypot id="website" />

      <TurnstileWidget check={check} />
      {formError}

      {!check.ready && (
        <p role="status" className="text-center text-sm text-ink-soft">
          Checking that you’re not a robot… the button turns on in a moment.
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={Boolean(busy) || !check.ready} className={next}>
          {busy === "book" ? "Holding your dates…" : busy === "code" ? "Sending code…" : "Next"}
        </button>
      </div>
      <p className="flex items-center gap-1.5 text-sm text-ink-soft">
        <Icon name="lock" className="h-3.5 w-3.5" />
        {session
          ? `Your dates are held for ${holdMinutes} minutes while you pay.`
          : mobileMode
            ? "Next, we’ll text a code to your mobile to confirm it’s you. That creates your account."
            : "Next, we’ll email you a code to confirm it’s you. That creates your account."}
      </p>
      {!session && phoneSignIn && (
        <p className="text-center text-sm">
          <button type="button" onClick={() => { setMethod(mobileMode ? "email" : "phone"); setErrors({}); }} className={textButton}>
            {mobileMode ? "Confirm by email instead" : "Confirm by SMS instead"}
          </button>
        </p>
      )}
    </form>
  );
}
