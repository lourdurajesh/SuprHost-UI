"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { formatDate, nightsBetween, todayIn } from "@/lib/dates";
import { DateRangePicker } from "./date-range-picker";
import { Icon } from "./icons";

const noSubscribe = () => () => {};

interface Props {
  checkIn: string | null;
  checkOut: string | null;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
  timezone?: string;
  /** "pill": standalone rounded button (filter bar). "field": label + value inside a larger bar (hero). */
  variant?: "pill" | "field";
  label?: string;
}

/** One "Add dates" control that opens a two-month range calendar, instead of two date inputs. */
export function DateRangeField({ checkIn, checkOut, onChange, timezone = "Asia/Kolkata", variant = "pill", label = "When" }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const today = useSyncExternalStore(noSubscribe, () => todayIn(timezone), () => null);
  const [draft, setDraft] = useState<{ checkIn: string | null; checkOut: string | null }>({ checkIn, checkOut });

  const summary =
    checkIn && checkOut
      ? `${formatDate(checkIn, { day: "numeric", month: "short" })} – ${formatDate(checkOut, { day: "numeric", month: "short" })}`
      : "Add dates";

  function open() {
    setDraft({ checkIn, checkOut });
    dialog.current?.showModal();
  }

  function done() {
    dialog.current?.close();
    if (draft.checkIn && draft.checkOut) onChange(draft.checkIn, draft.checkOut);
    else if (!draft.checkIn) onChange(null, null);
  }

  const nights = draft.checkIn && draft.checkOut ? nightsBetween(draft.checkIn, draft.checkOut) : 0;

  return (
    <>
      {variant === "pill" ? (
        <button
          type="button"
          onClick={open}
          className={`inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm ring-1 outline-none ${checkIn && checkOut ? "ring-ink" : "ring-line"} hover:ring-ink-soft`}
        >
          <Icon name="calendar" className="h-4 w-4" /> {summary}
        </button>
      ) : (
        <button type="button" onClick={open} className="block w-full text-left">
          <span className="block text-[11px] uppercase tracking-[0.14em] text-ink-soft">{label}</span>
          <span className={`block truncate text-sm ${checkIn && checkOut ? "text-ink" : "text-ink-soft"}`}>{summary}</span>
        </button>
      )}

      <dialog
        ref={dialog}
        aria-label="Choose dates"
        className="m-auto w-[min(720px,calc(100vw-1.5rem))] rounded-3xl bg-white p-0 text-ink backdrop:bg-black/40"
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <p className="text-lg">
              {nights > 0 ? `${nights} night${nights === 1 ? "" : "s"}` : draft.checkIn ? "Select check-out" : "Select check-in"}
            </p>
            <p className="text-sm text-ink-soft">
              {draft.checkIn ? formatDate(draft.checkIn) : "Check-in"} → {draft.checkOut ? formatDate(draft.checkOut) : "Check-out"}
            </p>
          </div>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="rounded-full p-2 hover:bg-sand-deep">
            <Icon name="close" />
          </button>
        </div>
        <div className="px-6 py-5">
          {today && (
            <DateRangePicker
              today={today}
              busy={[]}
              checkIn={draft.checkIn}
              checkOut={draft.checkOut}
              maxNights={60}
              onChange={(ci, co) => setDraft({ checkIn: ci, checkOut: co })}
            />
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line px-6 py-4">
          <button type="button" onClick={() => setDraft({ checkIn: null, checkOut: null })} className="text-sm underline underline-offset-4">
            Clear dates
          </button>
          <button
            type="button"
            onClick={done}
            disabled={Boolean(draft.checkIn) && !draft.checkOut}
            className="rounded-full bg-brand px-6 py-3 text-white hover:brightness-125 disabled:opacity-40"
          >
            {draft.checkIn && draft.checkOut ? "Apply" : draft.checkIn ? "Pick check-out" : "Done"}
          </button>
        </div>
      </dialog>
    </>
  );
}
