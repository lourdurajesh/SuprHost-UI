"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bookUrl } from "@/lib/links";
import { useAvailability } from "@/lib/use-availability";
import { DatesDialog } from "./dates-dialog";
import { CountRow } from "./search/count-row";
import { changeButton } from "./step-card";
import { buttonClass, textButton } from "./ui/button";
import { Dialog, DialogClose } from "./ui/dialog";

interface Stay {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

/** The same checkout page, for other dates or guests. */
function useChangeStay(stay: Stay) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const change = (next: Partial<Stay>) => start(() => router.replace(bookUrl(stay.listingId, { ...stay, ...next }), { scroll: false }));
  return { pending, change };
}

/** "Change" beside the dates in the checkout summary: a calendar, then the same page with the new price. */
export function ChangeDates({ stay, timezone, minNights, maxNights }: { stay: Stay; timezone: string; minNights: number; maxNights: number }) {
  const { pending, change } = useChangeStay(stay);
  const [open, setOpen] = useState(false);
  const { busy, rules } = useAvailability(stay.listingId, timezone, open);
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
        onChange={(checkIn, checkOut) => checkIn && checkOut && change({ checkIn, checkOut })}
        timezone={timezone}
        busy={busy}
        rules={rules}
        minNights={minNights}
        maxNights={maxNights}
      />
    </>
  );
}

/** "Change" beside the guests. */
export function ChangeGuests({ stay, maxGuests }: { stay: Stay; maxGuests: number }) {
  const { pending, change } = useChangeStay(stay);
  const [open, setOpen] = useState(false);
  const [guests, setGuests] = useState(stay.guests);
  const close = () => setOpen(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setGuests(stay.guests);
          setOpen(true);
        }}
        aria-label="Change guests"
        disabled={pending}
        className={changeButton}
      >
        {pending ? "…" : "Change"}
      </button>
      <Dialog open={open} onClose={close} labelledBy="change-guests">
        <div className="flex items-center justify-between">
          <h2 id="change-guests" className="text-h2">
            Change guests
          </h2>
          <DialogClose onClose={close} className="-mr-2" />
        </div>
        <p className="mt-1 text-sm text-ink-soft">This home sleeps up to {maxGuests}.</p>
        <div className="mt-2">
          <CountRow title="Guests" value={guests} min={1} max={maxGuests} onChange={setGuests} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={close} className={textButton}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              close();
              if (guests !== stay.guests) change({ guests });
            }}
            className={buttonClass("dark")}
          >
            Save
          </button>
        </div>
      </Dialog>
    </>
  );
}
