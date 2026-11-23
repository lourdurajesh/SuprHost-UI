import type { ListingImage, Quote } from "@/lib/pms";
import { formatDate, formatMoney } from "@/lib/dates";
import { Icon } from "@/components/icons";
import { PriceBreakdown } from "@/components/price-breakdown";
import { ListingPhoto } from "./listing-media";

const STEPS = ["Your details", "Payment", "Confirmed"];

export function CheckoutSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol data-booking-flow className="flex items-center gap-2 text-sm sm:gap-3">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2 sm:gap-3">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              i < current ? "bg-accent text-white" : i === current ? "bg-brand text-white" : "bg-sand-deep text-ink-soft"
            }`}
          >
            {i < current ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
          </span>
          <span className={i === current ? "font-medium" : "hidden text-ink-soft sm:inline"}>{label}</span>
          {i === current && <span className="text-ink-soft sm:hidden">· Step {i + 1} of {STEPS.length}</span>}
          {i < STEPS.length - 1 && <span aria-hidden className="h-px w-6 bg-line sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}

export function StaySummary({
  name,
  propertyName,
  image,
  checkIn,
  checkOut,
  guests,
  quote,
  footer,
  phoneFirst = true,
}: {
  name: string;
  propertyName: string;
  image: ListingImage | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  quote: Quote;
  footer?: React.ReactNode;
  /** Above the main column on phones (checkout: "what am I booking?"); false keeps it after (confirmation). */
  phoneFirst?: boolean;
}) {
  return (
    <>
    {/* Phones, checkout: one line with the total sits above the form; the breakdown opens on tap, so
        the form starts on the first screen. From lg up the full summary sits beside the form. */}
    {phoneFirst && (
      <details className="order-first rounded-2xl border border-line bg-white lg:hidden [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-3">
          <ListingPhoto image={image} name="" sizes="56px" className="h-12 w-14 shrink-0 rounded-lg" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{name}</span>
            <span className="block text-sm text-ink-soft">
              {formatDate(checkIn, { day: "numeric", month: "short" })} – {formatDate(checkOut, { day: "numeric", month: "short" })} · {guests} guest{guests === 1 ? "" : "s"}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block font-medium">{formatMoney(quote.total, quote.currency)}</span>
            <span className="block text-sm text-ink-soft underline underline-offset-4">Price details</span>
          </span>
        </summary>
        <div className="border-t border-line p-4">
          <PriceBreakdown quote={quote} />
          {footer}
        </div>
      </details>
    )}
    <aside className={`${phoneFirst ? "max-lg:hidden" : ""} h-fit overflow-hidden rounded-2xl border border-line bg-white lg:sticky lg:top-24`}>
      <ListingPhoto image={image} name={name} sizes="420px" className="aspect-[5/2] max-lg:hidden" />
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <ListingPhoto image={image} name="" sizes="80px" className="h-16 w-20 shrink-0 rounded-lg lg:hidden" />
          <div className="min-w-0">
            <p className="text-eyebrow uppercase text-accent">{propertyName}</p>
            <p className="mt-0.5 text-h3">{name}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="border-l-2 border-line pl-3">
            <p className="text-eyebrow uppercase text-ink-soft">Check-in</p>
            <p className="font-medium">{formatDate(checkIn, { weekday: "short", day: "numeric", month: "short" })}</p>
          </div>
          <div className="border-l-2 border-line pl-3">
            <p className="text-eyebrow uppercase text-ink-soft">Check-out</p>
            <p className="font-medium">{formatDate(checkOut, { weekday: "short", day: "numeric", month: "short" })}</p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <Icon name="users" className="h-4 w-4" /> {guests} guest{guests === 1 ? "" : "s"} · {quote.nights} night{quote.nights === 1 ? "" : "s"}
        </p>

        <PriceBreakdown quote={quote} className="mt-5 border-t border-line pt-5" />
        {footer}
      </div>
    </aside>
    </>
  );
}
