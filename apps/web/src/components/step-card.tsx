import { Icon } from "./icons";

/** One numbered step of the checkout: open, done (one line says what was chosen) or still to come. */
export function StepCard({
  n,
  title,
  state,
  summary,
  action,
  children,
}: {
  n: 1 | 2 | 3;
  title: string;
  state: "todo" | "open" | "done";
  /** What was chosen, once done. */
  summary?: React.ReactNode;
  /** A "Change" button, once done. */
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-label={`Step ${n} of 3: ${title}`}
      aria-current={state === "open" ? "step" : undefined}
      className={`rounded-2xl border border-line bg-white p-5 sm:p-6 ${state === "open" ? "shadow-[0_6px_20px_rgba(0,0,0,0.12)]" : ""}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className={`text-lg ${state === "todo" ? "text-ink-soft" : ""}`}>
            {n}. {title}
            {state === "done" && (
              <>
                <Icon name="check" className="ml-2 inline h-4 w-4 text-accent" strokeWidth={2.6} />
                <span className="sr-only"> (done)</span>
              </>
            )}
          </h2>
          {state === "done" && summary && <p className="mt-1 truncate text-sm text-ink-soft">{summary}</p>}
        </div>
        {state === "done" && action}
      </div>
      {state === "open" && <div className="mt-5">{children}</div>}
    </section>
  );
}

/** The small grey "Change" buttons of the checkout. */
export const changeButton = "inline-flex min-h-11 shrink-0 items-center rounded-xl bg-sand-deep px-4 text-sm font-medium transition hover:brightness-95";
