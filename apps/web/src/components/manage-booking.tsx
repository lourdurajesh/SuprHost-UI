"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ManageInfo, Quote } from "@/lib/pms/types";
import { formatDate, formatMoney, stayDates } from "@/lib/dates";
import { bookingUrl } from "@/lib/links";
import { useAvailability } from "@/lib/use-availability";
import { DatesDialog } from "./dates-dialog";
import { openSignIn } from "./sign-in";
import { buttonClass, textButton } from "./ui/button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "./ui/dialog";

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
  /** Money was taken online (payment.status === "paid"); false when the host arranges payment. */
  paid: boolean;
  minNights: number;
  maxNights: number;
}

/**
 * Change dates or cancel, from the booking page. The PMS decides what's allowed and what it costs
 * (`manage`); this only explains it and asks for a clear yes. Both actions need the guest signed
 * in with the booking's email; a signed-out guest is sent to sign in and brought back here.
 */
export function ManageBooking({ token, listingId, checkIn, checkOut, guests, total, currency, timezone, manage, paid, minNights, maxNights }: Props) {
  const router = useRouter();
  const [datesOpen, setDatesOpen] = useState(false);
  const [proposed, setProposed] = useState<{ checkIn: string; checkOut: string; quote: Quote } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "quote" | "change" | "cancel">(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const money = (n: number) => formatMoney(n, currency);

  const { busy: taken, rules, reload } = useAvailability(listingId, timezone, datesOpen);
  // Minus this booking's own nights: they're free to move into.
  const others = taken.filter((b) => !(b.start === checkIn && b.end === checkOut));

  function signInAgain() {
    openSignIn(bookingUrl(token));
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
      reload();
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
    setCancelOpen(false);
    setBusy(null);
    if (r?.ok) return router.refresh();
    const body = await r?.json().catch(() => null);
    setError(body?.message ?? "We couldn’t cancel your booking. Please try again or contact us.");
  }

  const difference = proposed ? proposed.quote.total - total : 0;

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
            New dates: {stayDates(proposed.checkIn, proposed.checkOut)}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            New total {money(proposed.quote.total)}
            {difference === 0 ? " (no change)" : difference > 0 ? ` (${money(difference)} more)` : ` (${money(-difference)} less)`}.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={changeDates} disabled={busy !== null} className={buttonClass("primary", "sm")}>
              {busy === "change" ? "Changing…" : "Confirm new dates"}
            </button>
            <button type="button" onClick={() => setProposed(null)} className={buttonClass("outline", "sm")}>
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
          <button type="button" onClick={() => setDatesOpen(true)} disabled={busy !== null} className={buttonClass("outline", "sm")}>
            {busy === "quote" ? "Checking price…" : "Change dates"}
          </button>
        )}
        {manage.canCancel && (
          <button type="button" onClick={() => setCancelOpen(true)} disabled={busy !== null} className={buttonClass("dangerOutline", "sm")}>
            Cancel booking
          </button>
        )}
        <a href={bookingUrl(token, "receipt")} className={buttonClass("outline", "sm")}>
          Receipt
        </a>
        <a href={bookingUrl(token, "calendar.ics")} download className={buttonClass("outline", "sm")}>
          Add to calendar
        </a>
      </div>

      <DatesDialog
        open={datesOpen}
        onOpenChange={setDatesOpen}
        checkIn={proposed?.checkIn ?? checkIn}
        checkOut={proposed?.checkOut ?? checkOut}
        onChange={quoteFor}
        timezone={timezone}
        busy={others}
        rules={rules}
        minNights={minNights}
        maxNights={maxNights}
      />

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)}>
        <DialogHeader title="Cancel this booking?" />
        <DialogBody>
          <dl className="space-y-2">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Cancellation charge</dt>
              <dd>{money(manage.cancellationCharge)}</dd>
            </div>
            <div className="flex justify-between gap-4 font-medium">
              <dt>Refund</dt>
              {/* Only talk about a refund when money was actually taken online. */}
              <dd>{paid ? money(manage.refund) : "Nothing to refund"}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-ink-soft">
            {!paid && "You haven’t paid online for this booking. "}The dates are released at once. This can’t be undone.
          </p>
        </DialogBody>
        <DialogFooter>
          <button type="button" onClick={() => setCancelOpen(false)} data-autofocus className={textButton}>
            Keep booking
          </button>
          <button type="button" onClick={cancel} disabled={busy === "cancel"} className={buttonClass("danger")}>
            {busy === "cancel" ? "Cancelling…" : "Yes, cancel"}
          </button>
        </DialogFooter>
      </Dialog>
    </section>
  );
}
