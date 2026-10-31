"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Availability } from "@/lib/pms/types";
import { formatDate, nightsBetween, todayIn } from "@/lib/dates";
import { DateRangePicker } from "./date-range-picker";
import { Icon } from "./icons";

const noSubscribe = () => () => {};

export const shortRange = (checkIn: string | null, checkOut: string | null) =>
  checkIn && checkOut
    ? `${formatDate(checkIn, { day: "numeric", month: "short" })} – ${formatDate(checkOut, { day: "numeric", month: "short" })}`
    : "Add dates";

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
}

/**
 * The date picker in a modal: centred on larger screens, a bottom sheet on phones. Its content
 * mounts on each open, so it always starts from the applied dates and a cancelled draft never lingers.
 */
export function DatesDialog({ open, onOpenChange, ...rest }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Choose dates"
      onClose={() => onOpenChange(false)}
      onClick={(e) => e.target === ref.current && onOpenChange(false)}
      className="m-auto max-h-[92dvh] w-[min(720px,calc(100vw-2rem))] max-w-none flex-col rounded-2xl bg-white p-0 text-ink backdrop:bg-black/40 open:flex max-sm:mb-0 max-sm:w-full max-sm:rounded-b-none"
    >
      {open && <DatesDialogContent {...rest} close={() => onOpenChange(false)} />}
    </dialog>
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
}: Omit<DialogProps, "open" | "onOpenChange"> & { close: () => void }) {
  const today = useSyncExternalStore(noSubscribe, () => todayIn(timezone), () => null);
  const [draft, setDraft] = useState<{ checkIn: string | null; checkOut: string | null }>({ checkIn, checkOut });
  const nights = draft.checkIn && draft.checkOut ? nightsBetween(draft.checkIn, draft.checkOut) : 0;

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
            {nights > 0 ? `${nights} night${nights === 1 ? "" : "s"}` : draft.checkIn ? "Select check-out" : "Select check-in"}
          </p>
          <p className="text-sm text-ink-soft">
            {draft.checkIn ? formatDate(draft.checkIn) : "Check-in"} → {draft.checkOut ? formatDate(draft.checkOut) : "Check-out"}
            {minNights > 1 && ` · ${minNights}-night minimum`}
          </p>
        </div>
        <button type="button" onClick={close} aria-label="Close" className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-sand-deep">
          <Icon name="close" />
        </button>
      </div>
      <div className="overflow-y-auto px-5 py-4 sm:px-6">
        {today && (
          <DateRangePicker
            today={today}
            busy={busy}
            checkIn={draft.checkIn}
            checkOut={draft.checkOut}
            minNights={minNights}
            maxNights={maxNights}
            onChange={(ci, co) => setDraft({ checkIn: ci, checkOut: co })}
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3 sm:px-6">
        <button type="button" onClick={() => setDraft({ checkIn: null, checkOut: null })} className="min-h-11 text-sm underline underline-offset-4">
          Clear dates
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={Boolean(draft.checkIn) && !draft.checkOut}
          className="min-h-11 rounded-full bg-brand px-6 py-2.5 text-white hover:brightness-125 disabled:opacity-40"
        >
          {draft.checkIn && draft.checkOut ? "Apply" : draft.checkIn ? "Pick check-out" : "Done"}
        </button>
      </div>
    </>
  );
}

interface Props {
  checkIn: string | null;
  checkOut: string | null;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
  timezone?: string;
  /** "pill": standalone rounded button (filter bar). "field": label + value inside a larger bar (hero). */
  variant?: "pill" | "field";
  label?: string;
}

/** One "Add dates" control that opens the range calendar, instead of two date inputs. */
export function DateRangeField({ checkIn, checkOut, onChange, timezone, variant = "pill", label = "When" }: Props) {
  const [isOpen, setOpen] = useState(false);
  const summary = shortRange(checkIn, checkOut);
  const open = () => setOpen(true);

  return (
    <>
      {variant === "pill" ? (
        <button
          type="button"
          onClick={open}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm ring-1 outline-none ${checkIn && checkOut ? "ring-ink" : "ring-line"} hover:ring-ink-soft`}
        >
          <Icon name="calendar" className="h-4 w-4" /> {summary}
        </button>
      ) : (
        <button type="button" onClick={open} className="block w-full text-left">
          <span className="block text-eyebrow uppercase text-ink-soft">{label}</span>
          <span className={`block truncate text-sm ${checkIn && checkOut ? "text-ink" : "text-ink-soft"}`}>{summary}</span>
        </button>
      )}
      <DatesDialog open={isOpen} onOpenChange={setOpen} checkIn={checkIn} checkOut={checkOut} onChange={onChange} timezone={timezone} />
    </>
  );
}
