// The site's buttons, as class names, so links and buttons look the same. Add layout (margins, width) at the call.

const base =
  "focus-own inline-flex items-center justify-center gap-2 rounded-xl text-center font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const looks = {
  /** The one main action of a page or panel. */
  primary: "bg-brand text-white hover:brightness-110",
  /** The next step inside a flow. */
  dark: "bg-ink text-white hover:brightness-125",
  outline: "bg-white ring-1 ring-line hover:bg-sand-deep",
  soft: "bg-sand-deep hover:brightness-95",
  danger: "bg-red-800 text-white hover:bg-red-900",
  dangerOutline: "bg-white text-red-800 ring-1 ring-red-200 hover:bg-red-50",
} as const;

const sizes = {
  sm: "min-h-11 px-5 text-sm",
  md: "min-h-12 px-6",
  lg: "min-h-14 px-6 text-lg",
} as const;

export const buttonClass = (look: keyof typeof looks = "primary", size: keyof typeof sizes = "md") => `${base} ${looks[look]} ${sizes[size]}`;

/** Underlined text that acts as a button. */
export const textButton =
  "focus-own inline-flex min-h-11 items-center rounded-lg px-1 font-medium underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:text-field disabled:no-underline";

/** A round icon-only button (close, back). */
export const iconButton =
  "focus-own grid h-11 w-11 shrink-0 place-items-center rounded-full outline-none transition hover:bg-sand-deep focus-visible:ring-2 focus-visible:ring-ink";

/** A text field. */
export const fieldClass =
  "focus-own w-full rounded-xl border border-field bg-white px-4 py-3.5 text-base outline-none transition placeholder:text-ink-soft focus:border-ink focus:ring-1 focus:ring-ink read-only:bg-sand-deep read-only:text-ink-soft";

/** A white pill: filters, sorting. */
export const pillClass =
  "focus-own min-h-11 shrink-0 rounded-full bg-white px-4 py-2.5 text-sm ring-1 ring-line outline-none focus-visible:ring-2 focus-visible:ring-ink";
