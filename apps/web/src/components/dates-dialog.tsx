"use client";

import { useState } from "react";
import type { Availability } from "@/lib/pms/types";
import { useToday } from "@/lib/browser";
import { formatDate, minNightsOn, nightsBetween } from "@/lib/dates";
import { plural } from "@/lib/text";
import { DateRangePicker } from "./date-range-picker";
import { buttonClass, textButton } from "./ui/button";
import { Dialog, DialogClose } from "./ui/dialog";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkIn: string | null;
  checkOut: string | null;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
  timezone?: string;
  busy?: Availability["busy"];
  minNights?: number;
  maxNights?: number;
  rules?: Availability["rules"];
}

/**
 * The date picker in a modal: centred on larger screens, a bottom sheet on phones. Its content
 * mounts on each open, so it always starts from the applied dates and a cancelled draft never lingers.
 */
export function DatesDialog({ open, onOpenChange, ...rest }: DialogProps) {
  const close = () => onOpenChange(false);
  return (
    <Dialog open={open} onClose={close} label="Choose dates" layout="panel" width="45rem" phone="sheet">
      <DatesDialogContent {...rest} close={close} />
    </Dialog>
  );
}

function DatesDialogContent({
  checkIn,
  checkOut,
  onChange,
  close,
  timezone = "Asia/Kolkata",
  busy = [],
  minNights = 1,
  maxNights = 60,
  rules = [],
}: Omit<DialogProps, "open" | "onOpenChange"> & { close: () => void }) {
  const today = useToday(timezone);
  const [draft, setDraft] = useState<{ checkIn: string | null; checkOut: string | null }>({ checkIn, checkOut });
  const nights = draft.checkIn && draft.checkOut ? nightsBetween(draft.checkIn, draft.checkOut) : 0;
  const minimum = draft.checkIn ? minNightsOn(draft.checkIn, rules, minNights) : minNights;

  function apply() {
    close();
    if (draft.checkIn && draft.checkOut) onChange(draft.checkIn, draft.checkOut);
    else if (!draft.checkIn) onChange(null, null);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 sm:px-6">
        <div>
          <p className="text-lg">
            {nights > 0 ? plural(nights, "night") : draft.checkIn ? "Select check-out" : "Select check-in"}
          </p>
          <p className="text-sm text-ink-soft">
            {draft.checkIn ? formatDate(draft.checkIn) : "Check-in"} → {draft.checkOut ? formatDate(draft.checkOut) : "Check-out"}
            {minimum > 1 && ` · ${minimum}-night minimum${draft.checkIn && minimum !== minNights ? " for this check-in" : ""}`}
          </p>
        </div>
        <DialogClose onClose={close} />
      </div>
      <div className="relative overflow-y-auto px-5 py-4 sm:px-6">
        {today && (
          <DateRangePicker
            today={today}
            busy={busy}
            checkIn={draft.checkIn}
            checkOut={draft.checkOut}
            minNights={minNights}
            maxNights={maxNights}
            rules={rules}
            onChange={(ci, co) => setDraft({ checkIn: ci, checkOut: co })}
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3 sm:px-6">
        <button type="button" onClick={() => setDraft({ checkIn: null, checkOut: null })} className={`${textButton} text-sm`}>
          Clear dates
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={Boolean(draft.checkIn) && !draft.checkOut}
          className={buttonClass("primary", "sm")}
        >
          {draft.checkIn && draft.checkOut ? "Apply" : draft.checkIn ? "Pick check-out" : "Done"}
        </button>
      </div>
    </>
  );
}
