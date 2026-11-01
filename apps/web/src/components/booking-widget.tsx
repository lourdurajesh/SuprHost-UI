"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Availability, Quote } from "@/lib/pms/types";
import { addDays, formatDate, formatMoney, isIsoDate, minNightsOn, nightsBetween, todayIn } from "@/lib/dates";
import { DatesDialog, shortRange } from "./date-range-field";

const noSubscribe = () => () => {};

interface Props {
  listingId: string;
  maxGuests: number;
  minNights: number;
  /** GST is added to the nightly price at checkout. */
  pricesAddGst?: boolean;
  maxNights: number;
  fromPrice: number;
  currency: string;
  timezone: string;
}

// The only interactive island on a listing page: availability and price load live, everything
// else on the page is prerendered. Compact on purpose — dates open in a dialog — so the panel fits
// the viewport and Reserve is always in view. Below lg the panel sits in the page and a fixed bar
// at the bottom carries the price and the next action.
export function BookingWidget({ listingId, maxGuests, minNights: listingMinNights, maxNights, fromPrice, currency, timezone, pricesAddGst }: Props) {
  const router = useRouter();
  const [datesOpen, setDatesOpen] = useState(false);
  // "Today" is read in the browser only (null on the server), never baked into the prerendered page.
  const today = useSyncExternalStore(
    noSubscribe,
    () => todayIn(timezone),
    () => null,
  );
  const [busy, setBusy] = useState<Availability["busy"]>([]);
  const [rules, setRules] = useState<Availability["rules"]>([]);
  const [availabilityError, setAvailabilityError] = useState(false);
  // Dates and party size carried over from search (?checkIn&checkOut&guests), read in the browser
  // so the page itself stays static. The guest's own picks override them.
  const urlDates = useSyncExternalStore(
    noSubscribe,
    () => {
      const p = new URLSearchParams(window.location.search);
      const ci = p.get("checkIn"), co = p.get("checkOut");
      return ci && co && isIsoDate(ci) && isIsoDate(co) && co > ci ? `${ci}|${co}` : null;
    },
    () => null,
  );
  const [picked, setPicked] = useState<{ checkIn: string | null; checkOut: string | null } | null>(null);
  const checkIn = picked ? picked.checkIn : (urlDates?.split("|")[0] ?? null);
  const checkOut = picked ? picked.checkOut : (urlDates?.split("|")[1] ?? null);
  const urlGuests = useSyncExternalStore(
    noSubscribe,
    () => Number(new URLSearchParams(window.location.search).get("guests")) || null,
    () => null,
  );
  const [guestsChoice, setGuests] = useState<number | null>(null);
  const guests = Math.min(Math.max(guestsChoice ?? urlGuests ?? 2, 1), maxGuests);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    if (!today) return;
    const ctrl = new AbortController();
    fetch(`/api/availability?listing=${listingId}&from=${today}&to=${addDays(today, 400)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((a: Availability) => {
        setBusy(a.busy);
        setRules(a.rules ?? []);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setAvailabilityError(true);
      });
    return () => ctrl.abort();
  }, [listingId, today]);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const minNights = checkIn ? minNightsOn(checkIn, rules, listingMinNights) : listingMinNights;
  const tooShort = nights > 0 && nights < minNights;

  useEffect(() => {
    if (!checkIn || !checkOut || tooShort) return;
    const ctrl = new AbortController();
    fetch(`/api/quote?listing=${listingId}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`, { signal: ctrl.signal })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.message ?? "Price unavailable for these dates");
        setQuote(body as Quote);
        setQuoteError(null);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") {
          setQuote(null);
          setQuoteError(e.message);
        }
      });
    return () => ctrl.abort();
  }, [listingId, checkIn, checkOut, guests, tooShort]);

  function onDates(ci: string | null, co: string | null) {
    setPicked({ checkIn: ci, checkOut: co });
    setQuote(null);
    setQuoteError(null);
  }

  function reserve() {
    if (!checkIn || !checkOut || !quote) {
      setDatesOpen(true);
      return;
    }
    const q = new URLSearchParams({ listing: listingId, checkIn, checkOut, guests: String(guests) });
    router.push(`/book?${q}`);
  }

  const ready = Boolean(checkIn && checkOut && quote);
  const action = ready ? "Reserve" : checkIn && checkOut ? (quoteError || tooShort ? "Change dates" : "Checking price…") : "Check availability";
  const field = "flex min-h-14 flex-col justify-center px-4 py-2 text-left";

  return (
    <>
      <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_16px_40px_-24px_rgba(31,27,22,0.35)] sm:p-6">
        <p>
          {quote ? (
            <>
              <span className="text-h3">{formatMoney(quote.total, quote.currency)}</span>
              <span className="text-ink-soft"> for {nights} night{nights === 1 ? "" : "s"}</span>
            </>
          ) : (
            <>
              <span className="text-h3">{formatMoney(fromPrice, currency)}</span>
              <span className="text-ink-soft"> / night{pricesAddGst ? " + GST" : ""}</span>
            </>
          )}
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <button
            type="button"
            onClick={() => setDatesOpen(true)}
            className="grid w-full grid-cols-2 divide-x divide-line text-sm hover:bg-sand-deep/50"
            aria-label={checkIn && checkOut ? `Dates: ${formatDate(checkIn)} to ${formatDate(checkOut)}. Change dates` : "Add dates"}
          >
            <span className={field}>
              <span className="text-eyebrow text-ink-soft">Check-in</span>
              <span className={checkIn ? "" : "text-ink-soft"}>{checkIn ? formatDate(checkIn) : "Add date"}</span>
            </span>
            <span className={field}>
              <span className="text-eyebrow text-ink-soft">Check-out</span>
              <span className={checkOut ? "" : "text-ink-soft"}>{checkOut ? formatDate(checkOut) : "Add date"}</span>
            </span>
          </button>
          <label className={`${field} border-t border-line`}>
            <span className="text-eyebrow text-ink-soft">Guests</span>
            <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="-ml-0.5 w-full bg-transparent text-sm outline-none">
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} guest{n === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>
        </div>

        {availabilityError && <p className="mt-3 text-sm text-red-700">Could not load availability. Your dates will still be checked.</p>}
        {tooShort && (
          <p className="mt-3 text-sm text-red-700">
            Minimum stay is {minNights} nights{minNights !== listingMinNights ? " for this check-in date" : ""}.
          </p>
        )}
        {quoteError && !tooShort && <p className="mt-3 text-sm text-red-700">{quoteError}</p>}

        <button
          type="button"
          onClick={reserve}
          disabled={Boolean(checkIn && checkOut && !quote && !quoteError && !tooShort)}
          className="mt-4 min-h-12 w-full rounded-full bg-brand px-6 py-3 font-medium text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {action}
        </button>

        {quote && (
          <dl className="mt-4 space-y-1.5 text-sm">
            {quote.lines.map((l) => (
              <div key={l.label} className="flex justify-between gap-4 text-ink-soft">
                <dt>{l.label}</dt>
                <dd>{formatMoney(l.amount, quote.currency)}</dd>
              </div>
            ))}
            {(quote.taxes ?? []).map((t) => (
              <div key={t.label} className="flex justify-between gap-4 text-ink-soft">
                <dt>{t.label}</dt>
                <dd>{formatMoney(t.amount, quote.currency)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t border-line pt-2 font-medium">
              <dt>Total</dt>
              <dd>{formatMoney(quote.total, quote.currency)}</dd>
            </div>
          </dl>
        )}
        <p className="mt-3 text-center text-sm text-ink-soft">You won’t be charged until you confirm. Best price, booked direct.</p>
      </div>

      {/* Below lg: the next step stays on screen. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <button type="button" onClick={() => setDatesOpen(true)} className="min-w-0 text-left">
            <span className="block truncate font-medium">
              {quote ? formatMoney(quote.total, quote.currency) : `${formatMoney(fromPrice, currency)} / night${pricesAddGst ? " + GST" : ""}`}
            </span>
            <span className="block truncate text-sm text-ink-soft underline underline-offset-4">
              {checkIn && checkOut ? `${shortRange(checkIn, checkOut)} · ${guests} guest${guests === 1 ? "" : "s"}` : "Add dates"}
            </span>
          </button>
          <button
            type="button"
            onClick={reserve}
            disabled={Boolean(checkIn && checkOut && !quote && !quoteError && !tooShort)}
            className="min-h-12 shrink-0 rounded-full bg-brand px-6 py-3 font-medium text-white disabled:opacity-60"
          >
            {ready ? "Reserve" : checkIn && checkOut && !quoteError && !tooShort ? "Checking…" : "Check availability"}
          </button>
        </div>
      </div>

      <DatesDialog
        open={datesOpen}
        onOpenChange={setDatesOpen}
        checkIn={checkIn}
        checkOut={checkOut}
        onChange={onDates}
        timezone={timezone}
        busy={busy}
        minNights={listingMinNights}
        rules={rules}
        maxNights={maxNights}
      />
    </>
  );
}
