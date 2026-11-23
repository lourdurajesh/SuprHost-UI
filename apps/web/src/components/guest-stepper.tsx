"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  onChange: (value: number) => void;
  max: number;
  min?: number;
  /** Show "guest(s)" beside the number; off where a label above already says it. */
  showUnit?: boolean;
  /** 36px buttons instead of 40px, for tight places like the hero search bar. */
  compact?: boolean;
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
export function GuestStepper({ value, onChange, max, min = 1, showUnit = true, compact = false, className = "" }: Props) {
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
  const button =
    `grid ${compact ? "h-9 w-9" : "h-10 w-10"} shrink-0 place-items-center rounded-lg text-ink ring-1 ring-line transition hover:ring-ink aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:ring-line`;

  return (
    <div role="group" aria-label="Guests" className={`flex items-center justify-between gap-3 ${className}`}>
      <button
        type="button"
        aria-label="Fewer guests"
        aria-disabled={atMin}
        onClick={() => !atMin && apply(value - 1)}
        className={button}
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4.5 10h11" />
        </svg>
      </button>

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
          className="w-9 rounded-md bg-transparent text-center text-base tabular-nums text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink"
        />
        {showUnit && (
          <span className="whitespace-nowrap text-sm text-ink-soft" aria-hidden>
            {limitHit ? `max ${max}` : value === 1 ? "guest" : "guests"}
          </span>
        )}
      </label>

      <button
        type="button"
        aria-label="More guests"
        aria-disabled={atMax}
        onClick={() => {
          if (atMax) flashLimit();
          else apply(value + 1);
        }}
        className={button}
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4.5 10h11M10 4.5v11" />
        </svg>
      </button>

      {/* Announces changes and limits to screen readers. */}
      <span role="status" className="sr-only">
        {limitHit ? `Maximum ${max} guests` : `${value} ${value === 1 ? "guest" : "guests"}`}
      </span>
    </div>
  );
}
