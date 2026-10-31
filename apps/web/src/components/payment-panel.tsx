"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { PaymentMethod } from "@/lib/pms/types";
import { formatMoney } from "@/lib/dates";
import { Icon } from "./icons";

const METHODS: Record<PaymentMethod, { label: string; icon: string; hint: string }> = {
  upi: { label: "UPI", icon: "upi", hint: "Pay with Google Pay, PhonePe, Paytm or any UPI app." },
  card: { label: "Credit or debit card", icon: "card", hint: "Visa, Mastercard, RuPay and American Express." },
  netbanking: { label: "Net banking", icon: "bank", hint: "All major Indian banks." },
};

interface Props {
  token: string;
  total: number;
  currency: string;
  methods: PaymentMethod[];
  holdExpiresAt: string;
  simulated: boolean;
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

// Step 2 of checkout. The selected method is sent to the PMS, whose payment plugin decides what
// happens: simulated mode confirms immediately; a real gateway returns a redirect to its own page.
export function PaymentPanel({ token, total, currency, methods, holdExpiresAt, simulated }: Props) {
  const router = useRouter();
  const now = useNow();
  const [method, setMethod] = useState<PaymentMethod>(methods[0] ?? "upi");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = now === null ? null : Math.max(0, new Date(holdExpiresAt).getTime() - now);
  const expired = remaining === 0;

  useEffect(() => {
    if (expired) router.refresh();
  }, [expired, router]);

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
    <div>
      <div className="flex items-center justify-between rounded-2xl bg-sand-deep/70 px-4 py-3 text-sm">
        <span className="flex items-center gap-2">
          <Icon name="clock" className="h-4 w-4" /> Dates held for you
        </span>
        <span className="font-mono font-medium tabular-nums" aria-live="polite">
          {mins === null ? "--:--" : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
        </span>
      </div>

      {simulated && (
        <p className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Test mode.</strong> Online payment is not switched on yet, so no money will be taken. Your booking will
          be confirmed and the host will arrange payment with you.
        </p>
      )}

      <fieldset className="mt-5 space-y-3">
        <legend className="mb-3 text-sm font-medium">Choose how to pay</legend>
        {methods.map((m) => {
          const info = METHODS[m];
          const selected = method === m;
          return (
            <label
              key={m}
              className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                selected ? "border-brand bg-brand/[0.04] ring-4 ring-brand/10" : "border-line bg-white hover:border-ink-soft/40"
              }`}
            >
              <input type="radio" name="method" value={m} checked={selected} onChange={() => setMethod(m)} className="sr-only" />
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-brand text-white" : "bg-sand-deep text-ink"}`}>
                <Icon name={info.icon} />
              </span>
              <span className="flex-1">
                <span className="block font-medium">{info.label}</span>
                <span className="block text-sm text-ink-soft">{info.hint}</span>
              </span>
              <span
                aria-hidden
                className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? "border-brand" : "border-field"}`}
              >
                {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
              </span>
            </label>
          );
        })}
      </fieldset>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={pay}
        disabled={paying || expired}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-4 text-lg font-medium text-white shadow-lg shadow-brand/20 transition hover:brightness-110 disabled:opacity-50"
      >
        <Icon name="lock" className="h-4 w-4" />
        {paying ? "Processing…" : `Pay ${formatMoney(total, currency)}`}
      </button>
      <p className="mt-3 text-center text-xs text-ink-soft">Payments are encrypted. We never see or store your card details.</p>
    </div>
  );
}
