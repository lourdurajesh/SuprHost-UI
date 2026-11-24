"use client";

import { useRef } from "react";
import type { StayLength } from "@/lib/pms/types";
import { monthName, STAY_LABEL } from "@/lib/search-query";
import { useToday } from "@/lib/browser";
import { plural } from "@/lib/text";
import { DateRangePicker } from "../date-range-picker";
import { Icon } from "../icons";

export interface WhenDraft {
  mode: "dates" | "flexible";
  checkIn?: string;
  checkOut?: string;
  flex?: number;
  stay?: StayLength;
  months: string[];
}

/** The next n months as yyyy-MM, starting with the current one. */
function upcomingMonths(today: string, n: number): string[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

const chip = (on: boolean) =>
  `focus-own min-h-10 rounded-full px-4 py-2 text-sm ring-1 transition focus-visible:ring-2 focus-visible:ring-ink ${
    on ? "bg-sand-deep ring-2 ring-ink" : "bg-white ring-line hover:ring-ink-soft"
  }`;

/** When: exact dates (with ± days) or "I'm flexible" (how long, and which months). */
export function WhenPanel({
  draft,
  timezone,
  onChange,
  onDatesComplete,
}: {
  draft: WhenDraft;
  timezone: string;
  onChange: (patch: Partial<WhenDraft>) => void;
  onDatesComplete?: () => void;
}) {
  const today = useToday(timezone);
  const months = useRef<HTMLDivElement>(null);
  const flexible = draft.mode === "flexible";

  return (
    <div>
      {/* Dates | Flexible: a two-way switch whose white thumb slides. */}
      <div role="group" aria-label="How to choose dates" className="relative mx-auto grid w-72 grid-cols-2 rounded-full bg-sand-deep p-1 text-sm">
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-md ring-1 ring-line transition-transform duration-200 ease-out"
          style={{ transform: flexible ? "translateX(100%)" : "none" }}
        />
        {(["dates", "flexible"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={draft.mode === m}
            onClick={() => onChange(m === "flexible" ? { mode: m, stay: draft.stay ?? "weekend" } : { mode: m })}
            className="focus-own relative z-10 min-h-10 rounded-full px-4 capitalize focus-visible:ring-2 focus-visible:ring-ink"
          >
            {m}
          </button>
        ))}
      </div>

      {!flexible ? (
        <div key="dates" className="panel-in mt-6">
          {today && (
            <DateRangePicker
              today={today}
              busy={[]}
              checkIn={draft.checkIn ?? null}
              checkOut={draft.checkOut ?? null}
              maxNights={60}
              onChange={(ci, co) => {
                onChange({ checkIn: ci ?? undefined, checkOut: co ?? undefined, flex: ci ? draft.flex : undefined });
                if (ci && co) onDatesComplete?.();
              }}
            />
          )}
          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Date flexibility">
            {[undefined, 1, 2, 3].map((d) => (
              <button key={d ?? 0} type="button" aria-pressed={draft.flex === d} onClick={() => onChange({ flex: d })} className={chip(draft.flex === d)}>
                {d ? `± ${plural(d, "day")}` : "Exact dates"}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div key="flexible" className="panel-in mt-6 space-y-8">
          <div>
            <p className="text-center text-lg">How long would you like to stay?</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {(Object.keys(STAY_LABEL) as StayLength[]).map((s) => (
                <button key={s} type="button" aria-pressed={draft.stay === s} onClick={() => onChange({ stay: s })} className={chip(draft.stay === s)}>
                  {STAY_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-center text-lg">When do you want to go?</p>
            <div className="relative mt-4">
              <div ref={months} className="no-scrollbar -mx-2 flex snap-x gap-3 overflow-x-auto px-2 py-2">
                {today &&
                  upcomingMonths(today, 12).map((ym) => {
                    const on = draft.months.includes(ym);
                    return (
                      <button
                        key={ym}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onChange({ months: on ? draft.months.filter((x) => x !== ym) : [...draft.months, ym].sort().slice(0, 6) })}
                        className={`focus-own flex h-28 w-28 shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-2xl text-sm ring-1 transition focus-visible:ring-2 focus-visible:ring-ink ${
                          on ? "bg-sand-deep ring-2 ring-ink" : "bg-white ring-line hover:ring-ink-soft"
                        }`}
                      >
                        <Icon name="calendar" className="h-7 w-7" strokeWidth={1.3} />
                        <span className="mt-1 font-medium">{monthName(ym)}</span>
                        <span className="text-ink-soft">{ym.slice(0, 4)}</span>
                      </button>
                    );
                  })}
              </div>
              <button
                type="button"
                aria-label="Show later months"
                onClick={() => months.current?.scrollBy({ left: 280, behavior: "smooth" })}
                className="absolute right-0 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white shadow-md ring-1 ring-line hover:ring-ink max-sm:hidden"
              >
                <Icon name="chevronRight" className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-center text-sm text-ink-soft">Pick up to six months, or none for any time soon. Each home shows the first stretch it has free.</p>
          </div>
        </div>
      )}
    </div>
  );
}

