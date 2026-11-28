"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { GuestSession } from "@/lib/pms/types";
import { createBooking, nextPageFor } from "@/lib/create-booking";
import { maskMobile } from "@/lib/mobile";
import { CheckoutForm, type GuestDetails } from "./checkout-form";
import { Icon } from "./icons";
import { Honeypot, honeypotValue } from "./sign-in-code";
import { changeButton, StepCard } from "./step-card";
import { buttonClass, fieldClass } from "./ui/button";

interface Props {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  session: GuestSession | null;
  phoneSignIn: boolean;
  /** Hours the host has to accept. */
  hours: number;
  /** "₹6,400": what the guest pays once the host accepts. */
  total: string;
  /** Online payment is off: once accepted, the guest confirms and the host arranges payment. */
  simulated: boolean;
  /** Check-in times, house rules and what the guest agrees to, shown in the last step. */
  review: React.ReactNode;
}

/** A signed-in guest whose account already has everything a request needs skips step 1. */
function detailsOf(session: GuestSession | null): GuestDetails | null {
  if (!session?.name || !session.email || !session.phone) return null;
  return { name: session.name, email: session.email, phone: session.phone };
}

const contactOf = (d: GuestDetails) => (d.phone.startsWith("+91") ? maskMobile(d.phone) : d.email);

/** Too short to tell the host anything. */
const MIN_MESSAGE = 10;

// Checkout for a request to book, in three steps: sign in, a message to the host (it starts the
// conversation on the booking page), then review and send. Nothing is paid here: once the host
// accepts, the booking page opens payment.
export function RequestSteps({ listingId, checkIn, checkOut, guests, session, phoneSignIn, hours, total, simulated, review }: Props) {
  const router = useRouter();
  const [details, setDetails] = useState<GuestDetails | null>(() => detailsOf(session));
  const [step, setStep] = useState<1 | 2 | 3>(() => (detailsOf(session) ? 2 : 1));
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
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

  function onMessage(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < MIN_MESSAGE) {
      setMessageError("Write the host a few words: who’s coming and what brings you here.");
      requestAnimationFrame(() => document.getElementById("request-message")?.focus());
      return;
    }
    go(3);
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
    if (result.fields?.message) {
      go(2);
      setMessageError(result.fields.message);
    } else if (result.fields || result.signInExpired) {
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
          title="Message the host"
          state={step === 2 ? "open" : step > 2 ? "done" : "todo"}
          summary={message.trim()}
          action={change(2, "your message")}
        >
          <form onSubmit={onMessage} noValidate>
            <p className="text-sm text-ink-soft">
              Say who’s coming, what brings you here and anything you’d like to agree, such as arrival time. You can keep talking with the host
              after you send the request.
            </p>
            <label htmlFor="request-message" className="sr-only">
              Message to the host
            </label>
            <textarea
              id="request-message"
              rows={5}
              maxLength={1000}
              placeholder="Hi! We’re two friends visiting for a wedding, arriving around 3 pm. Is early check-in possible?"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setMessageError(null);
              }}
              aria-invalid={Boolean(messageError)}
              aria-describedby={messageError ? "request-message-error" : undefined}
              className={`${fieldClass} mt-3`}
            />
            {messageError && (
              <p id="request-message-error" className="mt-1.5 text-sm text-red-700">
                {messageError}
              </p>
            )}
            <div className="mt-5 flex justify-end border-t border-line pt-5">
              <button type="submit" className={`${buttonClass("dark")} max-sm:w-full`}>
                Next
              </button>
            </div>
          </form>
        </StepCard>,
      )}

      {wrap(
        3,
        <StepCard n={3} title="Review your request" state={step === 3 ? "open" : "todo"}>
          <div className="mb-6 space-y-3 rounded-xl bg-sand-deep px-4 py-3.5 text-sm">
            <p className="flex gap-3">
              <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>The host has {hours} hours to accept. Your dates are held until then.</span>
            </p>
            <p className="flex gap-3">
              <Icon name="wallet" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {simulated
                  ? "You won’t pay now. Once the host accepts, you confirm the booking; online payment isn’t switched on yet, so the host arranges payment with you."
                  : `You won’t pay now. Once the host accepts, you pay ${total} to confirm the booking.`}
              </span>
            </p>
          </div>
          {review}
          <Honeypot id="request-website" />
          <div className="mt-5">{alert}</div>
          <button type="button" onClick={send} disabled={busy} className={`${buttonClass("primary", "lg")} w-full`}>
            {busy ? "Sending your request…" : "Request to book"}
          </button>
          <p className="mt-3 text-center text-xs text-ink-soft">Nothing is charged unless the host accepts.</p>
        </StepCard>,
      )}
    </div>
  );
}
