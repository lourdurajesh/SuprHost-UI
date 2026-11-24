"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Availability } from "@/lib/pms/types";
import { addDays, todayIn } from "@/lib/dates";
import { DatesDialog } from "./date-range-field";
import { Icon } from "./icons";
import { CountRow } from "./search/count-row";
import { changeButton } from "./step-card";

interface Stay {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

const bookUrl = (s: Stay) => `/book?${new URLSearchParams({ listing: s.listingId, checkIn: s.checkIn, checkOut: s.checkOut, guests: String(s.guests) })}`;

/** "Change" beside the dates in the checkout summary: a calendar, then the same page with the new price. */
export function ChangeDates({ stay, timezone, minNights, maxNights }: { stay: Stay; timezone: string; minNights: number; maxNights: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [availability, setAvailability] = useState<Availability | null>(null);

  useEffect(() => {
    if (!open || availability) return;
    const today = todayIn(timezone);
    const ctrl = new AbortController();
    fetch(`/api/availability?listing=${stay.listingId}&from=${today}&to=${addDays(today, 400)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setAvailability)
      // The dates are checked again when the price is worked out, so a blank calendar is only less helpful.
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [open, availability, stay.listingId, timezone]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Change dates" disabled={pending} className={changeButton}>
        {pending ? "…" : "Change"}
      </button>
      <DatesDialog
        open={open}
        onOpenChange={setOpen}
        checkIn={stay.checkIn}
        checkOut={stay.checkOut}
        onChange={(checkIn, checkOut) => {
          if (checkIn && checkOut) start(() => router.replace(bookUrl({ ...stay, checkIn, checkOut }), { scroll: false }));
        }}
        timezone={timezone}
        busy={availability?.busy ?? []}
        rules={availability?.rules ?? []}
        minNights={minNights}
        maxNights={maxNights}
      />
    </>
  );
}

/** "Change" beside the guests. */
export function ChangeGuests({ stay, maxGuests }: { stay: Stay; maxGuests: number }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [guests, setGuests] = useState(stay.guests);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setGuests(stay.guests);
          dialog.current?.showModal();
        }}
        aria-label="Change guests"
        disabled={pending}
        className={changeButton}
      >
        {pending ? "…" : "Change"}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="change-guests"
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="modal-in m-auto w-[min(30rem,calc(100vw-2rem))] max-w-none rounded-[28px] bg-white p-6 text-ink shadow-[0_24px_80px_-20px_rgba(0,0,0,0.5)] backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between">
          <h2 id="change-guests" className="text-h2">
            Change guests
          </h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="-mr-2 grid h-11 w-11 place-items-center rounded-full hover:bg-sand-deep">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-soft">This home sleeps up to {maxGuests}.</p>
        <div className="mt-2">
          <CountRow title="Guests" value={guests} min={1} max={maxGuests} onChange={setGuests} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={() => dialog.current?.close()} className="min-h-11 rounded-lg px-1 font-medium underline underline-offset-4">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              dialog.current?.close();
              if (guests !== stay.guests) start(() => router.replace(bookUrl({ ...stay, guests }), { scroll: false }));
            }}
            className="min-h-12 rounded-xl bg-ink px-8 font-medium text-white"
          >
            Save
          </button>
        </div>
      </dialog>
    </>
  );
}
