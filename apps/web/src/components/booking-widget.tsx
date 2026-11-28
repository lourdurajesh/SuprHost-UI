"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Quote } from "@/lib/pms/types";
import { useBrowserValue } from "@/lib/browser";
import { formatDate, formatMoney, minNightsOn, nightsBetween, shortRange } from "@/lib/dates";
import { bookUrl, whatsappUrl } from "@/lib/links";
import { queryFromParams } from "@/lib/search-query";
import { plural } from "@/lib/text";
import { useAvailability } from "@/lib/use-availability";
import { useCalendarSlot } from "./calendar-slot";
import { DatesDialog } from "./dates-dialog";
import { DateRangePicker } from "./date-range-picker";
import { GuestStepper } from "./guest-stepper";
import { PriceBreakdown } from "./price-breakdown";
import { trackFunnel } from "./track";
import { buttonClass, textButton } from "./ui/button";

interface Props {
  listingId: string;
  city: string;
  maxGuests: number;
  minNights: number;
  /** GST is added to the nightly price at checkout. */
  pricesAddGst?: boolean;
  maxNights: number;
  fromPrice: number;
  currency: string;
  timezone: string;
  /** The host's WhatsApp and the stay's name: adds an "Ask the host" link that carries the guest's dates. */
  askHost?: { whatsapp: string; stayName: string };
  /** False: the host accepts each booking first, so the button asks instead of reserving. */
  instantBook?: boolean;
  /** Hours the host has to answer a request. */
  requestHours?: number;
}

// The only interactive island on a listing page: availability and price load live, everything
// else on the page is prerendered. Compact on purpose — dates open in a dialog — so the panel fits
// the viewport and Reserve is always in view. Below lg the panel sits in the page and a fixed bar
// at the bottom carries the price and the next action.
export function BookingWidget({ listingId, city, maxGuests, minNights: listingMinNights, maxNights, fromPrice, currency, timezone, pricesAddGst, askHost, instantBook = true, requestHours = 24 }: Props) {
  const reserveLabel = instantBook ? "Reserve" : "Request to book";
  const router = useRouter();
  const [datesOpen, setDatesOpen] = useState(false);
  const calendarSlot = useCalendarSlot(listingId);
  const { busy, rules, today, failed: availabilityFailed } = useAvailability(listingId, timezone);
  // Dates and party size carried over from search (?checkIn&checkOut&guests), read in the browser
  // so the page itself stays static. The guest's own picks override them.
  const search = useBrowserValue(() => window.location.search, "");
  const fromUrl = useMemo(() => queryFromParams(new URLSearchParams(search)), [search]);
  const [picked, setPicked] = useState<{ checkIn: string | null; checkOut: string | null } | null>(null);
  const { checkIn = null, checkOut = null } = picked ?? fromUrl;
  const [guestsChoice, setGuests] = useState<number | null>(null);
  const guests = Math.min(Math.max(guestsChoice ?? fromUrl.guests ?? 2, 1), maxGuests);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

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

  // A guest who is shown a price for their dates is one step from checkout.
  const quotedKey = quote ? `${quote.checkIn}|${quote.checkOut}` : null;
  useEffect(() => {
    if (quotedKey) trackFunnel("quote", listingId);
  }, [quotedKey, listingId]);

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
    router.push(bookUrl(listingId, { checkIn, checkOut, guests }));
  }

  const ready = Boolean(checkIn && checkOut && quote);
  const action = ready ? reserveLabel : checkIn && checkOut ? (quoteError || tooShort ? "Change dates" : "Checking price…") : "Check availability";
  const field = "flex min-h-14 flex-col justify-center px-4 py-2 text-left";

  const message = tooShort ? `Minimum stay is ${minNights} nights${minNights !== listingMinNights ? " for this check-in date" : ""}.` : quoteError;

  return (
    <>
      <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_6px_20px_rgba(0,0,0,0.12)] sm:p-6">
        <p>
          {quote ? (
            <>
              <span className="text-h2 font-medium underline underline-offset-4">{formatMoney(quote.total, quote.currency)}</span>
              <span className="text-ink-soft"> for {plural(nights, "night")}</span>
            </>
          ) : (
            <>
              <span className="text-ink-soft">From </span>
              <span className="text-h2 font-medium">{formatMoney(fromPrice, currency)}</span>
              <span className="text-ink-soft"> / night{pricesAddGst ? " + GST" : ""}</span>
            </>
          )}
        </p>

        <div className="mt-5 overflow-hidden rounded-xl border border-field has-[[aria-expanded=true]]:rounded-b-none">
          <button
            type="button"
            onClick={() => setDatesOpen(true)}
            className="grid w-full grid-cols-2 divide-x divide-field text-sm hover:bg-sand-deep/50"
            aria-haspopup="dialog"
            aria-describedby={message ? "booking-message" : undefined}
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
          <div className={`${field} border-t border-field`}>
            <span className="text-eyebrow text-ink-soft">Guests</span>
            <GuestStepper value={guests} onChange={setGuests} max={maxGuests} className="mt-1" />
          </div>
        </div>

        {availabilityFailed && <p className="mt-3 text-sm text-red-700">Could not load availability. Your dates will still be checked.</p>}
        <p id="booking-message" role="alert" className="mt-3 text-sm text-red-700 empty:hidden">
          {message}
        </p>

        <button
          type="button"
          onClick={reserve}
          disabled={Boolean(checkIn && checkOut && !quote && !quoteError && !tooShort)}
          className={`${buttonClass()} mt-4 w-full`}
        >
          {action}
        </button>

        {quote && <PriceBreakdown quote={quote} className="mt-4" />}
        {/* Same height as a quote, so the panel doesn't jump when the price arrives. */}
        {!quote && checkIn && checkOut && !quoteError && !tooShort && (
          <div aria-hidden className="mt-4 animate-pulse space-y-2">
            <div className="h-5 rounded bg-sand-deep" />
            <div className="h-5 rounded bg-sand-deep" />
            <div className="h-5 w-4/5 rounded bg-sand-deep" />
            <div className="mt-3 h-7 rounded bg-sand-deep" />
          </div>
        )}
        <p className="mt-3 text-center text-sm text-ink-soft">
          {instantBook
            ? "You won’t be charged until you confirm. Best price, booked direct."
            : `The host confirms each booking, usually within ${requestHours} hours. You won’t be charged unless they accept.`}
        </p>
        {askHost && (
          <a
            href={
              whatsappUrl(
                askHost.whatsapp,
                `Hello! I'm looking at ${askHost.stayName}${checkIn && checkOut ? ` for ${formatDate(checkIn)} to ${formatDate(checkOut)}, ${plural(guests, "guest")}` : ""}. Could you help me with a question?`,
              ) ?? undefined
            }
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex min-h-11 items-center justify-center text-sm font-medium underline underline-offset-4"
          >
            Ask the host about {checkIn && checkOut ? "these dates" : "this stay"} on WhatsApp
          </a>
        )}
      </div>

      {/* Below md: the next step stays on screen. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <button type="button" onClick={() => setDatesOpen(true)} className="min-w-0 text-left">
            <span className="block truncate font-medium">
              {quote ? formatMoney(quote.total, quote.currency) : `From ${formatMoney(fromPrice, currency)} / night`}
            </span>
            <span className="block truncate text-sm text-ink-soft underline underline-offset-4">
              {checkIn && checkOut
                ? `${shortRange(checkIn, checkOut)} · ${plural(guests, "guest")}`
                : `${pricesAddGst ? "+ GST · " : ""}Add dates`}
            </span>
          </button>
          <button
            type="button"
            onClick={reserve}
            disabled={Boolean(checkIn && checkOut && !quote && !quoteError && !tooShort)}
            className={`${buttonClass()} shrink-0`}
          >
            {ready ? reserveLabel : checkIn && checkOut && !quoteError && !tooShort ? "Checking…" : "Check dates"}
          </button>
        </div>
      </div>

      {calendarSlot &&
        today &&
        createPortal(
          <>
            <h2 className="text-h2">{nights > 0 ? `${plural(nights, "night")} in ${city}` : checkIn ? "Select check-out date" : "Select check-in date"}</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {checkIn && checkOut ? `${formatDate(checkIn)} – ${formatDate(checkOut)}` : "Add your travel dates for exact prices"}
            </p>
            <div className="mt-6">
              <DateRangePicker today={today} busy={busy} checkIn={checkIn} checkOut={checkOut} minNights={listingMinNights} maxNights={maxNights} rules={rules} onChange={onDates} />
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => onDates(null, null)} disabled={!checkIn} className={`${textButton} text-sm`}>
                Clear dates
              </button>
            </div>
          </>,
          calendarSlot,
        )}

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
