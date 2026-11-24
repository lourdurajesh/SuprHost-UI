"use client";

import { useEffect, useRef, useState } from "react";
import { plural } from "@/lib/text";
import { StepButton } from "./ui/step-button";

interface Props {
  value: number;
  onChange: (value: number) => void;
  max: number;
  min?: number;
  className?: string;
}

const LIMIT_NOTE_MS = 2500;
const TYPING_PAUSE_MS = 700;

/**
 * Guests as − [number] + : squared buttons at each end and a number in the middle that can also be
 * typed. Buttons step by one (and use aria-disabled at the limits, so keyboard focus never falls off
 * a button that has just gone inactive); arrow keys inside the number step too. A typed number is
 * applied when typing pauses, on Enter, or on leaving the field; anything above the limit becomes the
 * limit (and the unit briefly reads "max N"), anything unreadable returns to the current value.
 */
export function GuestStepper({ value, onChange, max, min = 1, className = "" }: Props) {
  // While the number is being typed it shows the draft; otherwise the real value.
  const [draft, setDraft] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const timers = useRef<{ pause?: ReturnType<typeof setTimeout>; note?: ReturnType<typeof setTimeout> }>({});

  useEffect(() => {
    const t = timers.current;
    return () => {
      clearTimeout(t.pause);
      clearTimeout(t.note);
    };
  }, []);

  function flashLimit() {
    setLimitHit(true);
    clearTimeout(timers.current.note);
    timers.current.note = setTimeout(() => setLimitHit(false), LIMIT_NOTE_MS);
  }

  function apply(next: number) {
    const clamped = Math.min(max, Math.max(min, next));
    if (next > max) flashLimit();
    if (clamped !== value) onChange(clamped);
  }

  function commit(text: string) {
    clearTimeout(timers.current.pause);
    const n = parseInt(text, 10);
    if (Number.isNaN(n)) return; // nothing readable: fall back to the current value
    apply(n);
    // If the number was out of range, the field shows what was actually applied.
    const clamped = Math.min(max, Math.max(min, n));
    setDraft((d) => (d === null ? null : String(clamped)));
  }

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div role="group" aria-label="Guests" className={`flex items-center justify-between gap-3 ${className}`}>
      <StepButton kind="less" label="Fewer guests" atLimit={atMin} onClick={() => !atMin && apply(value - 1)} />

      <label className="flex min-w-0 items-baseline justify-center gap-1.5">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          autoComplete="off"
          aria-label={`Number of guests, up to ${max}`}
          value={draft ?? String(value)}
          onFocus={(e) => {
            setDraft(String(value));
            e.currentTarget.select();
          }}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            setDraft(digits);
            clearTimeout(timers.current.pause);
            if (digits) timers.current.pause = setTimeout(() => commit(digits), TYPING_PAUSE_MS);
          }}
          onBlur={() => {
            if (draft) commit(draft);
            setDraft(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const base = draft && !Number.isNaN(parseInt(draft, 10)) ? parseInt(draft, 10) : value;
              const next = Math.min(max, Math.max(min, base + (e.key === "ArrowUp" ? 1 : -1)));
              if (e.key === "ArrowUp" && base >= max) flashLimit();
              setDraft(String(next));
              commit(String(next));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (draft) commit(draft);
              setDraft(null);
            } else if (e.key === "Escape") {
              setDraft(null);
            }
          }}
          className="focus-own w-9 rounded-md bg-transparent text-center text-base tabular-nums text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink"
        />
        <span className="whitespace-nowrap text-sm text-ink-soft" aria-hidden>
          {limitHit ? `max ${max}` : value === 1 ? "guest" : "guests"}
        </span>
      </label>

      <StepButton kind="more" label="More guests" atLimit={atMax} onClick={() => (atMax ? flashLimit() : apply(value + 1))} />

      {/* Announces changes and limits to screen readers. */}
      <span role="status" className="sr-only">
        {limitHit ? `Maximum ${max} guests` : plural(value, "guest")}
      </span>
    </div>
  );
}
