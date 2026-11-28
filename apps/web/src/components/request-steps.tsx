"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { GuestSession, PaymentMethod } from "@/lib/pms/types";
import { createBooking, nextPageFor } from "@/lib/create-booking";
import { maskMobile } from "@/lib/mobile";
import { CheckoutForm, type GuestDetails } from "./checkout-form";
import { Icon } from "./icons";
import { Honeypot, honeypotValue } from "./sign-in-code";
import { changeButton, StepCard } from "./step-card";
import { buttonClass, fieldClass } from "./ui/button";

const METHODS: Record<PaymentMethod, { label: string; icon: string }> = {
  upi: { label: "UPI", icon: "upi" },
  card: { label: "Credit or debit card", icon: "card" },
  netbanking: { label: "Net banking", icon: "bank" },
};

interface Props {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  session: GuestSession | null;
  phoneSignIn: boolean;
  /** Hours the host has to accept. */
  hours: number;
  /** Online payment is off: an accepted request is confirmed and the host arranges payment. */
  simulated: boolean;
  methods: PaymentMethod[];
  /** Check-in times, house rules and what the guest agrees to, shown in the last step. */
  review: React.ReactNode;
}

/** A signed-in guest whose account already has everything a request needs skips step 1. */
function detailsOf(session: GuestSession | null): GuestDetails | null {
  if (!session?.name || !session.email || !session.phone) return null;
  return { name: session.name, email: session.email, phone: session.phone };
}

const contactOf = (d: GuestDetails) => (d.phone.startsWith("+91") ? maskMobile(d.phone) : d.email);

// Checkout for a request to book, in three steps like the instant checkout: sign in, how payment
// works (nothing is charged now), then review and send. The host accepts or declines in the PMS.
export function RequestSteps({ listingId, checkIn, checkOut, guests, session, phoneSignIn, hours, simulated, methods, review }: Props) {
  const router = useRouter();
  const [details, setDetails] = useState<GuestDetails | null>(() => detailsOf(session));
  const [step, setStep] = useState<1 | 2 | 3>(() => (detailsOf(session) ? 2 : 1));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef(new Map<string, string>());
  const mountedAt = useRef(0);
  const opened = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  // The next step opens below: bring it into view and tell the keyboard and screen readers.
  useEffect(() => {
    if (firstRender.current) firstRender.current = false;
    else opened.current?.focus();
  }, [step]);

  function go(to: 1 | 2 | 3) {
    setError(null);
    setStep(to);
  }

  function ready(confirmed: GuestDetails) {
    setDetails(confirmed);
    go(2);
    // A guest who just signed in: the page re-renders with their session, so going back to step 1 prefills it.
    if (!session) router.refresh();
  }

  async function send() {
    if (busy || !details) return;
    setBusy(true);
    setError(null);
    const stay = `${checkIn}|${checkOut}|${guests}`;
    const idempotencyKey = keys.current.get(stay) ?? crypto.randomUUID();
    keys.current.set(stay, idempotencyKey);
    const result = await createBooking({
      listingId,
      checkIn,
      checkOut,
      guests,
      ...details,
      message: message.trim(),
      website: honeypotValue("request-website"),
      elapsedMs: Math.round(performance.now() - mountedAt.current),
      idempotencyKey,
    });
    if (result.ok) {
      // Full navigation so the header picks up a session started on this page.
      window.location.assign(nextPageFor(result.token, result.status));
      return;
    }
    setBusy(false);
    if (result.fields?.message) setError(result.fields.message);
    else if (result.fields || result.signInExpired) {
      // Something about who is booking: back to step 1, where the fields are.
      go(1);
      setError(result.signInExpired ? result.message : Object.values(result.fields ?? {})[0] ?? result.message);
    } else setError(result.message);
  }

  const alert = error && (
    <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
      {error}
    </p>
  );
  const change = (to: 1 | 2, what: string) => (
    <button type="button" onClick={() => go(to)} aria-label={`Change ${what}`} className={changeButton}>
      Change
    </button>
  );
  // The open step gets the focus target, so moving on announces it.
  const wrap = (n: 1 | 2 | 3, card: React.ReactNode) => (
    <div ref={step === n ? opened : undefined} tabIndex={-1} className="scroll-mt-6 rounded-2xl outline-none focus-visible:outline-none">
      {card}
    </div>
  );

  return (
    <div className="space-y-5">
      {wrap(
        1,
        <StepCard
          n={1}
          title={session || details ? "Your details" : "Log in or sign up"}
          state={step === 1 ? "open" : details ? "done" : "todo"}
          summary={details && `${details.name} · ${contactOf(details)}`}
          action={change(1, "your details")}
        >
          {alert}
          <CheckoutForm
            listingId={listingId}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            holdMinutes={0}
            session={session}
            phoneSignIn={phoneSignIn}
            onReady={ready}
          />
        </StepCard>,
      )}

      {wrap(
        2,
        <StepCard
          n={2}
          title="Payment"
          state={step === 2 ? "open" : step > 2 ? "done" : "todo"}
          summary="Pay after the host accepts"
          action={change(2, "payment")}
        >
          <div className="space-y-4 text-sm">
            <p className="flex gap-3">
              <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={2.4} />
              <span>
                <span className="block font-medium">You won’t be charged now</span>
                <span className="text-ink-soft">
                  The host has {hours} hours to accept. If they decline or don’t reply in time, the request ends and nothing is charged.
                </span>
              </span>
            </p>
            {simulated ? (
              <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
                <strong>Test mode.</strong> Online payment is not switched on yet. If the host accepts, your booking is confirmed and the host
                arranges payment with you.
              </p>
            ) : (
              <div>
                <p className="flex gap-3">
                  <Icon name="lock" className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>
                    <span className="block font-medium">Pay online once accepted</span>
                    <span className="text-ink-soft">We’ll email you when the host accepts. Pay then to confirm your booking.</span>
                  </span>
                </p>
                {methods.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2 pl-8" aria-label="Ways to pay">
                    {methods.map((m) => (
                      <li key={m} className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-ink-soft">
                        <Icon name={METHODS[m].icon} className="h-4 w-4" strokeWidth={1.6} /> {METHODS[m].label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="mt-5 flex justify-end border-t border-line pt-5">
            <button type="button" onClick={() => go(3)} className={`${buttonClass("dark")} max-sm:w-full`}>
              Next
            </button>
          </div>
        </StepCard>,
      )}

      {wrap(
        3,
        <StepCard n={3} title="Review your request" state={step === 3 ? "open" : "todo"}>
          <div>
            <label htmlFor="request-message" className="font-medium">
              Message the host <span className="font-normal text-ink-soft">(optional)</span>
            </label>
            <p className="mt-1 text-sm text-ink-soft">Say who’s coming and what brings you here. It helps the host say yes.</p>
            <textarea
              id="request-message"
              rows={4}
              maxLength={1000}
              placeholder="Hi! We’re two friends visiting for a wedding, arriving around 3 pm…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`${fieldClass} mt-2`}
            />
          </div>
          <div className="mt-6">{review}</div>
          <Honeypot id="request-website" />
          <div className="mt-5">{alert}</div>
          <button type="button" onClick={send} disabled={busy} className={`${buttonClass("primary", "lg")} w-full`}>
            {busy ? "Sending your request…" : "Request to book"}
          </button>
          <p className="mt-3 text-center text-xs text-ink-soft">
            Your dates are held while the host decides. You won’t be charged unless they accept.
          </p>
        </StepCard>,
      )}
    </div>
  );
}
