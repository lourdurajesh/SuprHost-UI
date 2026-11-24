"use client";

import { StepButton } from "../ui/step-button";

/**
 * A labelled count with squared − and + buttons: guests in the search panel, rooms in the filters.
 * `zeroLabel` is shown instead of 0 ("Any"). A live region announces the value.
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
  const shown = value === 0 && zeroLabel ? zeroLabel : String(value);
  const step = (to: number) => to >= min && to <= max && onChange(to);

  return (
    <div role="group" aria-label={title} className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-base">{title}</p>
        {hint && <p className="text-sm text-ink-soft">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StepButton kind="less" size="sm" label={`Fewer ${title.toLowerCase()}`} atLimit={value <= min} onClick={() => step(value - 1)} />
        <span className="w-10 text-center tabular-nums">{shown}</span>
        <StepButton kind="more" size="sm" label={`More ${title.toLowerCase()}`} atLimit={value >= max} onClick={() => step(value + 1)} />
      </div>
      <span role="status" className="sr-only">
        {title}: {shown}
      </span>
    </div>
  );
}
