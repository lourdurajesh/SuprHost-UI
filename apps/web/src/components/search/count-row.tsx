"use client";

/**
 * A labelled count with squared − and + buttons: guests in the search panel, rooms in the filters.
 * `zeroLabel` is shown instead of 0 ("Any"). Buttons use aria-disabled at the limits so keyboard
 * focus is never lost, and a live region announces the value.
 */
export function CountRow({
  title,
  hint,
  value,
  min = 0,
  max,
  zeroLabel,
  onChange,
}: {
  title: string;
  hint?: string;
  value: number;
  min?: number;
  max: number;
  zeroLabel?: string;
  onChange: (value: number) => void;
}) {
  const atMin = value <= min;
  const atMax = value >= max;
  const button =
    "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink ring-1 ring-line transition hover:ring-ink aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:ring-line";
  const shown = value === 0 && zeroLabel ? zeroLabel : String(value);

  return (
    <div role="group" aria-label={title} className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-base">{title}</p>
        {hint && <p className="text-sm text-ink-soft">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button type="button" aria-label={`Fewer ${title.toLowerCase()}`} aria-disabled={atMin} onClick={() => !atMin && onChange(value - 1)} className={button}>
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4.5 10h11" />
          </svg>
        </button>
        <span className="w-10 text-center tabular-nums">{shown}</span>
        <button type="button" aria-label={`More ${title.toLowerCase()}`} aria-disabled={atMax} onClick={() => !atMax && onChange(value + 1)} className={button}>
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4.5 10h11M10 4.5v11" />
          </svg>
        </button>
      </div>
      <span role="status" className="sr-only">
        {title}: {shown}
      </span>
    </div>
  );
}
