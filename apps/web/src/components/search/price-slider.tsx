"use client";

import { formatMoney } from "@/lib/dates";

const BINS = 28;
const STEP = 100;

/**
 * Nightly price as a histogram of every home's price with a two-handled slider over it, and the
 * chosen minimum and maximum in boxes underneath. `lo`/`hi` are undefined while a side is untouched.
 */
export function PriceSlider({
  prices,
  min,
  max,
  lo,
  hi,
  currency,
  onChange,
}: {
  prices: number[];
  min: number;
  max: number;
  lo?: number;
  hi?: number;
  currency: string;
  onChange: (lo: number | undefined, hi: number | undefined) => void;
}) {
  const floor = Math.floor(min / STEP) * STEP;
  const ceil = Math.max(floor + STEP, Math.ceil(max / STEP) * STEP);
  const a = Math.min(Math.max(lo ?? floor, floor), ceil);
  const b = Math.min(Math.max(hi ?? ceil, floor), ceil);

  // How many homes sit in each slice of the price range.
  const counts = Array<number>(BINS).fill(0);
  for (const p of prices) counts[Math.min(BINS - 1, Math.floor(((p - floor) / (ceil - floor)) * BINS))]++;
  const tallest = Math.max(1, ...counts);
  const pct = (v: number) => ((v - floor) / (ceil - floor)) * 100;

  const set = (nextLo: number, nextHi: number) => onChange(nextLo <= floor ? undefined : nextLo, nextHi >= ceil ? undefined : nextHi);
  const box = "flex min-w-0 flex-1 items-center gap-2 rounded-full px-5 py-2.5 ring-1 ring-field focus-within:ring-2 focus-within:ring-ink";

  return (
    <div>
      <div className="relative mt-6 h-20" aria-hidden>
        <div className="absolute inset-x-3 bottom-3 top-0 flex items-end gap-[3px]">
          {counts.map((c, i) => {
            const from = floor + (i / BINS) * (ceil - floor);
            const to = floor + ((i + 1) / BINS) * (ceil - floor);
            const inside = to > a && from < b;
            return <span key={i} className={`flex-1 rounded-t-sm transition-colors ${inside ? "bg-ink" : "bg-line"}`} style={{ height: `${Math.max(c ? 8 : 3, (c / tallest) * 100)}%` }} />;
          })}
        </div>
      </div>
      <div className="relative mx-3 h-8">
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-line" />
        <div className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-ink" style={{ left: `${pct(a)}%`, right: `${100 - pct(b)}%` }} />
        {([["Minimum price", a, (v: number) => set(Math.min(v, b - STEP), b)], ["Maximum price", b, (v: number) => set(a, Math.max(v, a + STEP))]] as const).map(([label, value, on]) => (
          <input
            key={label}
            type="range"
            aria-label={label}
            min={floor}
            max={ceil}
            step={STEP}
            value={value}
            onChange={(e) => on(Number(e.target.value))}
            className="dual-range"
          />
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <label className={box}>
          <span className="sr-only">Minimum price</span>
          <span className="text-sm text-ink-soft">Minimum</span>
          <input
            type="number"
            inputMode="numeric"
            min={floor}
            max={b - STEP}
            step={STEP}
            value={lo ?? ""}
            placeholder={formatMoney(floor, currency).replace(/\s/g, "")}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined, hi)}
            className="w-full min-w-0 bg-transparent text-right outline-none"
          />
        </label>
        <span aria-hidden className="h-px w-3 bg-field" />
        <label className={box}>
          <span className="sr-only">Maximum price</span>
          <span className="text-sm text-ink-soft">Maximum</span>
          <input
            type="number"
            inputMode="numeric"
            min={a + STEP}
            max={ceil}
            step={STEP}
            value={hi ?? ""}
            placeholder={formatMoney(ceil, currency).replace(/\s/g, "") + "+"}
            onChange={(e) => onChange(lo, e.target.value ? Number(e.target.value) : undefined)}
            className="w-full min-w-0 bg-transparent text-right outline-none"
          />
        </label>
      </div>
    </div>
  );
}
