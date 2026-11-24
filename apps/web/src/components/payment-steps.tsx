"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PaymentMethod } from "@/lib/pms/types";
import { formatMoney } from "@/lib/dates";
import { Icon } from "./icons";
import { changeButton, StepCard } from "./step-card";

const METHODS: Record<PaymentMethod, { label: string; icon: string; hint: string }> = {
  upi: { label: "UPI", icon: "upi", hint: "Google Pay, PhonePe, Paytm or any UPI app" },
  card: { label: "Credit or debit card", icon: "card", hint: "Visa, Mastercard, RuPay and American Express" },
  netbanking: { label: "Net banking", icon: "bank", hint: "All major Indian banks" },
};

interface Props {
  token: string;
  guestName: string;
  reference: string;
  total: number;
  currency: string;
  methods: PaymentMethod[];
  holdExpiresAt: string;
  simulated: boolean;
  /** What the guest is agreeing to, shown in the last step. */
  review: React.ReactNode;
}

// Ticks once a second on the client only; the server render shows no countdown.
function useNow() {
  return useSyncExternalStore(
    (notify) => {
      const id = setInterval(notify, 1000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 1000) * 1000,
    () => null,
  );
}

// Steps 2 and 3 of checkout (step 1, the guest's details, made the hold). The selected method is sent
// to the PMS, whose payment plugin decides what happens: simulated mode confirms immediately; a real
// gateway returns a redirect to its own page.
export function PaymentSteps({ token, guestName, reference, total, currency, methods, holdExpiresAt, simulated, review }: Props) {
  const router = useRouter();
  const now = useNow();
  const [step, setStep] = useState<2 | 3>(2);
  const [method, setMethod] = useState<PaymentMethod>(methods[0] ?? "upi");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const last = useRef<HTMLDivElement>(null);

  const remaining = now === null ? null : Math.max(0, new Date(holdExpiresAt).getTime() - now);
  const expired = remaining === 0;

  useEffect(() => {
    if (expired) router.refresh();
  }, [expired, router]);

  // The next step opens below: bring it into view and tell the keyboard and screen readers.
  useEffect(() => {
    if (step === 3) last.current?.focus();
  }, [step]);

  async function pay() {
    if (paying || expired) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(token)}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, idempotencyKey }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === "succeeded") {
        router.replace(`/booking/${encodeURIComponent(token)}`);
        return;
      }
      if (res.ok && body.status === "requires_action" && typeof body.redirectUrl === "string") {
        window.location.assign(body.redirectUrl);
        return;
      }
      if (res.status === 410) {
        router.refresh();
        return;
      }
      setError(body.message ?? "The payment didn't go through. You have not been charged. Please try again.");
    } catch {
      setError("Network problem. You have not been charged. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  const mins = remaining === null ? null : Math.floor(remaining / 60000);
  const secs = remaining === null ? null : Math.floor((remaining % 60000) / 1000);

  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        <Icon name="clock" className="h-4 w-4" /> Your dates are held for{" "}
        <span className="font-mono font-medium tabular-nums text-ink">{mins === null ? "--:--" : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}</span>
      </p>

      <StepCard n={1} title="Your details" state="done" summary={`${guestName} · Reservation ${reference}`} />

      <StepCard
        n={2}
        title="Choose how to pay"
        state={step === 2 ? "open" : "done"}
        summary={METHODS[method].label}
        action={
          <button type="button" onClick={() => setStep(2)} aria-label="Change how to pay" className={changeButton}>
            Change
          </button>
        }
      >
        {simulated && (
          <p className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Test mode.</strong> Online payment is not switched on yet, so no money will be taken. Your booking will be confirmed and the
            host will arrange payment with you.
          </p>
        )}
        <fieldset>
          <legend className="sr-only">Choose how to pay</legend>
          <div className="divide-y divide-line">
            {methods.map((m) => {
              const info = METHODS[m];
              const selected = method === m;
              return (
                <label key={m} className="flex cursor-pointer items-center gap-4 rounded-lg py-4 first:pt-0 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-ink">
                  <input type="radio" name="method" value={m} checked={selected} onChange={() => setMethod(m)} className="sr-only" />
                  <Icon name={info.icon} className="h-6 w-6 shrink-0" strokeWidth={1.4} />
                  <span className="flex-1">
                    <span className="block">{info.label}</span>
                    <span className="block text-sm text-ink-soft">{info.hint}</span>
                  </span>
                  <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-ink" : "border-field"}`}>
                    {selected && <span className="h-3 w-3 rounded-full bg-ink" />}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="mt-2 flex justify-end border-t border-line pt-5">
          <button type="button" onClick={() => setStep(3)} disabled={expired} className="min-h-12 rounded-xl bg-ink px-8 font-medium text-white disabled:opacity-50">
            Next
          </button>
        </div>
      </StepCard>

      <div ref={last} tabIndex={-1} className="scroll-mt-6 rounded-2xl outline-none focus-visible:outline-none">
        <StepCard n={3} title="Review your booking" state={step === 3 ? "open" : "todo"}>
          {review}
          {error && (
            <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={pay}
            disabled={paying || expired}
            className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-lg font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {paying ? "Processing…" : simulated ? "Confirm booking" : `Confirm and pay ${formatMoney(total, currency)}`}
          </button>
          <p className="mt-3 text-center text-xs text-ink-soft">
            {simulated ? "No money is taken now." : "Payments are encrypted. We never see or store your card details."}
          </p>
        </StepCard>
      </div>
    </div>
  );
}
