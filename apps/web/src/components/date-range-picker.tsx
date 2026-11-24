"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, minNightsOn, overlapsBusy, toIso, toUtc } from "@/lib/dates";
import type { StayRule } from "@/lib/pms/types";

type Busy = { start: string; end: string }[];

interface Props {
  today: string;
  busy: Busy;
  checkIn: string | null;
  checkOut: string | null;
  maxNights: number;
  /** Shortest stay; check-out dates before it are disabled. */
  minNights?: number;
  /** Seasonal minimum stays, by check-in night. */
  rules?: StayRule[];
  onChange: (checkIn: string | null, checkOut: string | null) => void;
}

/** Keys that move between days, and how far. Up and Down are a week, Page Up and Page Down four. */
const STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, PageUp: -28, PageDown: 28 };

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const SPOKEN = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

function addMonths(iso: string, n: number) {
  const d = toUtc(iso);
  d.setUTCMonth(d.getUTCMonth() + n, 1);
  return toIso(d);
}

function monthDays(first: string): (string | null)[] {
  const d = toUtc(first);
  const lead = (d.getUTCDay() + 6) % 7; // Monday first
  const days = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => addDays(first, i))];
}

function isBusyNight(date: string, busy: Busy) {
  return busy.some((b) => date >= b.start && date < b.end);
}

/** Two months of days. One Tab stop: the arrow keys move between the days that can be chosen. */
export function DateRangePicker({ today, busy, checkIn, checkOut, maxNights, minNights = 1, rules = [], onChange }: Props) {
  // Near the end of a month, open on the next one rather than a grid of past days.
  const [view, setView] = useState(() => monthStart(checkIn ?? addDays(today, 5)));
  const [hover, setHover] = useState<string | null>(null);
  const months = useMemo(() => [view, addMonths(view, 1)], [view]);
  const lastBookable = addDays(today, 540);
  const box = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const focusNext = useRef(false);

  function canCheckOut(date: string) {
    if (!checkIn || date < addDays(checkIn, minNightsOn(checkIn, rules, minNights))) return false;
    if (date > addDays(checkIn, maxNights)) return false;
    return !overlapsBusy(checkIn, date, busy);
  }

  function select(date: string) {
    if (checkIn && !checkOut && canCheckOut(date)) {
      onChange(checkIn, date);
    } else if (!isBusyNight(date, busy)) {
      onChange(date, null);
    }
  }

  function isDisabled(date: string) {
    if (date < today || date > lastBookable) return true;
    const pickingOut = Boolean(checkIn && !checkOut);
    return isBusyNight(date, busy) && !(pickingOut && canCheckOut(date));
  }

  const dayButton = (date: string) => box.current?.querySelector<HTMLElement>(`[data-date="${date}"]`);

  function onKeyDown(e: React.KeyboardEvent) {
    const from = (e.target as HTMLElement).dataset.date;
    const step = STEPS[e.key];
    if (!from || !step) return;
    e.preventDefault();
    // On to the next day that can be chosen, in the same direction.
    let to = addDays(from, step);
    while (to >= today && to <= lastBookable && isDisabled(to)) to = addDays(to, Math.abs(step) === 7 ? step : Math.sign(step));
    if (isDisabled(to)) return;
    if (!dayButton(to)?.offsetParent) setView(monthStart(to));
    focusNext.current = true;
    setCursor(to);
  }

  useEffect(() => {
    if (!focusNext.current || !cursor) return;
    focusNext.current = false;
    box.current?.querySelector<HTMLElement>(`[data-date="${cursor}"]`)?.focus();
  }, [cursor, view]);

  // The day Tab lands on: where the keys last were, else the chosen check-in, else the first free day.
  const open = months.flatMap((m) => monthDays(m)).filter((d): d is string => d !== null && !isDisabled(d));
  const tabStop = [cursor, checkIn].find((d) => d && open.includes(d)) ?? open[0];

  const rangeEnd = checkOut ?? (checkIn && hover && canCheckOut(hover) ? hover : null);

  return (
    <div ref={box} role="group" aria-label="Calendar" onKeyDown={onKeyDown} className="@container">
      <p className="sr-only">Use the arrow keys to move between days, and Enter to choose one.</p>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(addMonths(view, -1))}
          disabled={view <= monthStart(today)}
          className="grid h-11 w-11 place-items-center rounded-full text-ink-soft hover:bg-sand-deep disabled:opacity-30"
          aria-label="Previous month"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => setView(addMonths(view, 1))}
          disabled={view >= monthStart(lastBookable)}
          className="grid h-11 w-11 place-items-center rounded-full text-ink-soft hover:bg-sand-deep disabled:opacity-30"
          aria-label="Next month"
        >
          →
        </button>
      </div>
      {/* Two months only when the picker itself is wide enough, not the viewport. */}
      <div className="grid gap-6 @xl:grid-cols-2">
        {months.map((m, idx) => (
          <div key={m} className={idx === 1 ? "hidden @xl:block" : undefined}>
            <p className="mb-2 text-center text-sm font-medium">
              {new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(toUtc(m))}
            </p>
            <div className="grid grid-cols-7 text-center text-xs text-ink-soft">
              {WEEKDAYS.map((w) => (
                <span key={w} className="py-1">
                  {w}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 text-center text-sm" onMouseLeave={() => setHover(null)}>
              {monthDays(m).map((date, i) => {
                if (!date) return <span key={`e${i}`} />;
                const past = date < today || date > lastBookable;
                const busyNight = isBusyNight(date, busy);
                const disabled = isDisabled(date);
                const isStart = date === checkIn;
                const isEnd = date === rangeEnd;
                const inRange = checkIn && rangeEnd && date > checkIn && date < rangeEnd;
                return (
                  <button
                    key={date}
                    type="button"
                    data-date={date}
                    tabIndex={date === tabStop ? 0 : -1}
                    disabled={disabled}
                    onFocus={() => setCursor(date)}
                    onClick={() => select(date)}
                    onMouseEnter={() => setHover(date)}
                    aria-pressed={isStart || isEnd}
                    aria-label={`${SPOKEN.format(toUtc(date))}${busyNight ? ", unavailable" : ""}`}
                    className={[
                      "my-0.5 h-10 transition-colors",
                      isStart || isEnd ? "rounded-full bg-brand font-medium text-white" : "",
                      inRange ? "bg-brand/10" : "",
                      !isStart && !isEnd && !disabled ? "rounded-full hover:bg-sand-deep" : "",
                      disabled ? "cursor-not-allowed text-busy" : "",
                      busyNight && !past ? "line-through" : "",
                    ].join(" ")}
                  >
                    {Number(date.slice(8))}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
