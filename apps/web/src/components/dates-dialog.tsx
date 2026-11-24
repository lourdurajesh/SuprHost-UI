"use client";

import { useState } from "react";
import type { Availability } from "@/lib/pms/types";
import { useToday } from "@/lib/browser";
import { formatDate, minNightsOn, nightsBetween } from "@/lib/dates";
import { plural } from "@/lib/text";
import { DateRangePicker } from "./date-range-picker";
import { buttonClass, textButton } from "./ui/button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "./ui/dialog";

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
    <Dialog open={open} onClose={close} size="lg">
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
      <DialogHeader
        title="Choose dates"
        subtitle={
          <>
            {draft.checkIn ? `${formatDate(draft.checkIn)} → ${draft.checkOut ? formatDate(draft.checkOut) : "select check-out"}` : "Select check-in"}
            {nights > 0 && ` · ${plural(nights, "night")}`}
            {minimum > 1 && ` · ${minimum}-night minimum${draft.checkIn && minimum !== minNights ? " for this check-in" : ""}`}
          </>
        }
      />
      <DialogBody>
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
      </DialogBody>
      <DialogFooter>
        <button type="button" onClick={() => setDraft({ checkIn: null, checkOut: null })} className={textButton}>
          Clear dates
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={Boolean(draft.checkIn) && !draft.checkOut}
          className={buttonClass()}
        >
          {draft.checkIn && draft.checkOut ? "Apply" : draft.checkIn ? "Pick check-out" : "Done"}
        </button>
      </DialogFooter>
    </>
  );
}
