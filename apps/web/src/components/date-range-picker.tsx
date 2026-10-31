"use client";

import { useMemo, useState } from "react";
import { addDays, overlapsBusy, toIso, toUtc } from "@/lib/dates";

type Busy = { start: string; end: string }[];

interface Props {
  today: string;
  busy: Busy;
  checkIn: string | null;
  checkOut: string | null;
  maxNights: number;
  /** Shortest stay; check-out dates before it are disabled. */
  minNights?: number;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

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

export function DateRangePicker({ today, busy, checkIn, checkOut, maxNights, minNights = 1, onChange }: Props) {
  // Near the end of a month, open on the next one rather than a grid of past days.
  const [view, setView] = useState(() => monthStart(checkIn ?? addDays(today, 5)));
  const [hover, setHover] = useState<string | null>(null);
  const months = useMemo(() => [view, addMonths(view, 1)], [view]);
  const lastBookable = addDays(today, 540);

  function canCheckOut(date: string) {
    if (!checkIn || date < addDays(checkIn, minNights)) return false;
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

  const rangeEnd = checkOut ?? (checkIn && hover && canCheckOut(hover) ? hover : null);

  return (
    <div className="@container">
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
                const pickingOut = Boolean(checkIn && !checkOut);
                const disabled = past || (pickingOut ? !canCheckOut(date) && busyNight : busyNight);
                const isStart = date === checkIn;
                const isEnd = date === rangeEnd;
                const inRange = checkIn && rangeEnd && date > checkIn && date < rangeEnd;
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={disabled}
                    onClick={() => select(date)}
                    onMouseEnter={() => setHover(date)}
                    aria-pressed={isStart || isEnd}
                    aria-label={`${date}${busyNight ? ", unavailable" : ""}`}
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
