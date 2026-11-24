/**
 * A squared − or + button. At its limit it is aria-disabled rather than disabled, so keyboard focus
 * never falls off a button that has just gone inactive.
 */
export function StepButton({ kind, label, atLimit, onClick, size = "md" }: { kind: "less" | "more"; label: string; atLimit: boolean; onClick: () => void; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={atLimit}
      onClick={onClick}
      className={`grid ${size === "sm" ? "h-9 w-9" : "h-10 w-10"} shrink-0 place-items-center rounded-lg text-ink ring-1 ring-line transition hover:ring-ink aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:ring-line`}
    >
      <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d={kind === "less" ? "M4.5 10h11" : "M4.5 10h11M10 4.5v11"} />
      </svg>
    </button>
  );
}
