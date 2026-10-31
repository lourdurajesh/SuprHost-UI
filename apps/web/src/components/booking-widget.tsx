"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Availability, Quote } from "@/lib/pms/types";
import { addDays, formatDate, formatMoney, isIsoDate, nightsBetween, todayIn } from "@/lib/dates";
import { DateRangePicker } from "./date-range-picker";

const noSubscribe = () => () => {};

interface Props {
  listingId: string;
  maxGuests: number;
  minNights: number;
  maxNights: number;
  fromPrice: number;
  currency: string;
  timezone: string;
}

// The only interactive island on a listing page: availability and price load live, everything
// else on the page is prerendered.
export function BookingWidget({ listingId, maxGuests, minNights, maxNights, fromPrice, currency, timezone }: Props) {
  const router = useRouter();
  // "Today" is read in the browser only (null on the server), never baked into the prerendered page.
  const today = useSyncExternalStore(
    noSubscribe,
    () => todayIn(timezone),
    () => null,
  );
  const [busy, setBusy] = useState<Availability["busy"]>([]);
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
      .then((a: Availability) => setBusy(a.busy))
      .catch((e) => {
        if (e?.name !== "AbortError") setAvailabilityError(true);
      });
    return () => ctrl.abort();
  }, [listingId, today]);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
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

  function requestToBook() {
    if (!checkIn || !checkOut) return;
    const q = new URLSearchParams({ listing: listingId, checkIn, checkOut, guests: String(guests) });
    router.push(`/book?${q}`);
  }

  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-[0_24px_60px_-30px_rgba(31,27,22,0.4)] sm:p-6">
      <p className="text-lg">
        <span className="font-display text-2xl">{formatMoney(fromPrice, currency)}</span>
        <span className="text-ink-soft"> / night</span>
      </p>

      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-line text-sm">
        <div className="border-r border-line p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Check-in</p>
          <p>{checkIn ? formatDate(checkIn) : "Add date"}</p>
        </div>
        <div className="p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Check-out</p>
          <p>{checkOut ? formatDate(checkOut) : "Add date"}</p>
        </div>
      </div>

      <div className="mt-4">
        {today ? (
          <DateRangePicker
            today={today}
            busy={busy}
            checkIn={checkIn}
            checkOut={checkOut}
            maxNights={maxNights}
            onChange={onDates}
          />
        ) : (
          <div className="h-[330px] animate-pulse rounded-2xl bg-sand-deep/60" />
        )}
        {availabilityError && (
          <p className="mt-2 text-sm text-red-700">Could not load availability. Your request will still be checked.</p>
        )}
      </div>

      <label className="mt-4 flex items-center justify-between rounded-2xl border border-line p-3 text-sm">
        <span className="font-medium">Guests</span>
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="bg-transparent text-right outline-none"
        >
          {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} guest{n === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </label>

      {tooShort && <p className="mt-3 text-sm text-red-700">Minimum stay is {minNights} nights.</p>}
      {quoteError && <p className="mt-3 text-sm text-red-700">{quoteError}</p>}

      {quote && (
        <dl className="mt-4 space-y-2 text-sm">
          {quote.lines.map((l) => (
            <div key={l.label} className="flex justify-between text-ink-soft">
              <dt>{l.label}</dt>
              <dd>{formatMoney(l.amount, quote.currency)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-2 font-medium">
            <dt>Total</dt>
            <dd>{formatMoney(quote.total, quote.currency)}</dd>
          </div>
        </dl>
      )}

      <button
        type="button"
        onClick={requestToBook}
        disabled={!quote}
        className="mt-5 w-full rounded-full bg-brand px-6 py-3.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {checkIn && checkOut ? "Reserve" : "Select your dates"}
      </button>
      <p className="mt-3 text-center text-xs text-ink-soft">Instant confirmation once paid. Best price, booked direct.</p>
    </div>
  );
}
