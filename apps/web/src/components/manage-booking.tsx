"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Availability, ManageInfo, Quote } from "@/lib/pms/types";
import { addDays, formatDate, formatMoney, todayIn } from "@/lib/dates";
import { DatesDialog } from "./date-range-field";

interface Props {
  token: string;
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  currency: string;
  timezone: string;
  manage: ManageInfo;
  minNights: number;
  maxNights: number;
}

/**
 * Change dates or cancel, from the booking page. The PMS decides what's allowed and what it costs
 * (`manage`); this only explains it and asks for a clear yes. Both actions need the guest signed
 * in with the booking's email; a signed-out guest is sent to sign in and brought back here.
 */
export function ManageBooking({ token, listingId, checkIn, checkOut, guests, total, currency, timezone, manage, minNights, maxNights }: Props) {
  const router = useRouter();
  const [datesOpen, setDatesOpen] = useState(false);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [proposed, setProposed] = useState<{ checkIn: string; checkOut: string; quote: Quote } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "quote" | "change" | "cancel">(null);
  const cancelDialog = useRef<HTMLDialogElement>(null);
  const money = (n: number) => formatMoney(n, currency);

  // Busy nights for the picker, minus this booking's own nights (they're free to move into).
  useEffect(() => {
    if (!datesOpen || availability) return;
    const today = todayIn(timezone);
    fetch(`/api/availability?listing=${listingId}&from=${today}&to=${addDays(today, 400)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((a: Availability) =>
        setAvailability({ ...a, busy: a.busy.filter((b) => !(b.start === checkIn && b.end === checkOut)) }),
      )
      .catch(() => setAvailability({ listingId, from: "", to: "", busy: [], rules: [] }));
  }, [datesOpen, availability, listingId, timezone, checkIn, checkOut]);

  function signInAgain() {
    router.push(`/account/signin?next=${encodeURIComponent(`/booking/${token}`)}`);
  }

  async function quoteFor(ci: string | null, co: string | null) {
    if (!ci || !co || (ci === checkIn && co === checkOut)) return;
    setError(null);
    setBusy("quote");
    const r = await fetch(`/api/quote?listing=${listingId}&checkIn=${ci}&checkOut=${co}&guests=${guests}`).catch(() => null);
    const body = await r?.json().catch(() => null);
    setBusy(null);
    if (r?.ok) setProposed({ checkIn: ci, checkOut: co, quote: body as Quote });
    else setError(body?.message ?? "Those dates can’t be booked. Try others.");
  }

  async function changeDates() {
    if (!proposed) return;
    setBusy("change");
    setError(null);
    const r = await fetch(`/api/bookings/${encodeURIComponent(token)}/dates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkIn: proposed.checkIn, checkOut: proposed.checkOut }),
    }).catch(() => null);
    if (r?.status === 401) return signInAgain();
    if (r?.ok) {
      setProposed(null);
      setAvailability(null);
      setBusy(null);
      return router.refresh();
    }
    const body = await r?.json().catch(() => null);
    setBusy(null);
    setError(body?.message ?? "We couldn’t change your dates. Please try again or contact us.");
  }

  async function cancel() {
    setBusy("cancel");
    setError(null);
    const r = await fetch(`/api/bookings/${encodeURIComponent(token)}/cancel`, { method: "POST" }).catch(() => null);
    if (r?.status === 401) return signInAgain();
    cancelDialog.current?.close();
    setBusy(null);
    if (r?.ok) return router.refresh();
    const body = await r?.json().catch(() => null);
    setError(body?.message ?? "We couldn’t cancel your booking. Please try again or contact us.");
  }

  const difference = proposed ? proposed.quote.total - total : 0;
  const button = "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-medium";

  return (
    <section aria-labelledby="manage-heading" className="mt-10 border-t border-line pt-8">
      <h2 id="manage-heading" className="text-h2">Manage your booking</h2>
      <p className="mt-2 text-ink-soft">
        {manage.canChangeDates && manage.freeUntil
          ? `Change your dates or cancel for free until ${formatDate(manage.freeUntil, { weekday: "short", day: "numeric", month: "short" })}.`
          : manage.reason ?? "Contact us to change this booking."}
      </p>

      {proposed && (
        <div className="mt-5 rounded-2xl bg-sand-deep p-5" role="status">
          <p className="font-medium">
            New dates: {formatDate(proposed.checkIn, { day: "numeric", month: "short" })} – {formatDate(proposed.checkOut, { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            New total {money(proposed.quote.total)}
            {difference === 0 ? " (no change)" : difference > 0 ? ` (${money(difference)} more)` : ` (${money(-difference)} less)`}.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={changeDates} disabled={busy !== null} className={`${button} bg-brand text-white disabled:opacity-60`}>
              {busy === "change" ? "Changing…" : "Confirm new dates"}
            </button>
            <button type="button" onClick={() => setProposed(null)} className={`${button} ring-1 ring-line hover:bg-sand`}>
              Keep my dates
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {manage.canChangeDates && (
          <button type="button" onClick={() => setDatesOpen(true)} disabled={busy !== null} className={`${button} ring-1 ring-ink hover:bg-sand`}>
            {busy === "quote" ? "Checking price…" : "Change dates"}
          </button>
        )}
        {manage.canCancel && (
          <button type="button" onClick={() => cancelDialog.current?.showModal()} disabled={busy !== null} className={`${button} text-red-800 ring-1 ring-red-200 hover:bg-red-50`}>
            Cancel booking
          </button>
        )}
        <a href={`/booking/${encodeURIComponent(token)}/receipt`} className={`${button} ring-1 ring-line hover:bg-sand`}>
          Receipt
        </a>
      </div>

      <DatesDialog
        open={datesOpen}
        onOpenChange={setDatesOpen}
        checkIn={proposed?.checkIn ?? checkIn}
        checkOut={proposed?.checkOut ?? checkOut}
        onChange={quoteFor}
        timezone={timezone}
        busy={availability?.busy ?? []}
        rules={availability?.rules ?? []}
        minNights={minNights}
        maxNights={maxNights}
      />

      <dialog
        ref={cancelDialog}
        aria-labelledby="cancel-heading"
        onClick={(e) => e.target === cancelDialog.current && cancelDialog.current.close()}
        className="m-auto w-[min(480px,calc(100vw-2rem))] rounded-2xl bg-white p-6 text-ink backdrop:bg-black/40"
      >
        <h3 id="cancel-heading" className="text-h3">Cancel this booking?</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Cancellation charge</dt>
            <dd>{money(manage.cancellationCharge)}</dd>
          </div>
          <div className="flex justify-between gap-4 font-medium">
            <dt>Refund</dt>
            <dd>{money(manage.refund)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-ink-soft">The dates are released at once. This can’t be undone.</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => cancelDialog.current?.close()} className={`${button} ring-1 ring-line hover:bg-sand`} autoFocus>
            Keep booking
          </button>
          <button type="button" onClick={cancel} disabled={busy === "cancel"} className={`${button} bg-red-800 text-white disabled:opacity-60`}>
            {busy === "cancel" ? "Cancelling…" : "Yes, cancel"}
          </button>
        </div>
      </dialog>
    </section>
  );
}
