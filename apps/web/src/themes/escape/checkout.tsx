import type { ListingImage, Quote } from "@/lib/pms";
import { formatDate, formatMoney } from "@/lib/dates";
import { Icon } from "@/components/icons";
import { ListingPhoto } from "./listing-media";

const STEPS = ["Your details", "Payment", "Confirmed"];

export function CheckoutSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="flex items-center gap-2 text-sm sm:gap-3">
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
}: {
  name: string;
  propertyName: string;
  image: ListingImage | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  quote: Quote;
  footer?: React.ReactNode;
}) {
  return (
    <aside className="h-fit overflow-hidden rounded-3xl border border-line bg-white shadow-[0_20px_60px_-30px_rgba(31,27,22,0.35)]">
      <ListingPhoto image={image} name={name} sizes="400px" className="aspect-[16/9]" />
      <div className="p-6">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-accent">{propertyName}</p>
        <p className="mt-1 font-display text-2xl">{name}</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-sand-deep px-3 py-2.5">
            <p className="text-xs text-ink-soft">Check-in</p>
            <p className="font-medium">{formatDate(checkIn, { weekday: "short", day: "numeric", month: "short" })}</p>
          </div>
          <div className="rounded-xl bg-sand-deep px-3 py-2.5">
            <p className="text-xs text-ink-soft">Check-out</p>
            <p className="font-medium">{formatDate(checkOut, { weekday: "short", day: "numeric", month: "short" })}</p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <Icon name="users" className="h-4 w-4" /> {guests} guest{guests === 1 ? "" : "s"} · {quote.nights} night{quote.nights === 1 ? "" : "s"}
        </p>

        <dl className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
          {quote.lines.map((l) => (
            <div key={l.label} className="flex justify-between">
              <dt className="text-ink-soft">{l.label}</dt>
              <dd>{formatMoney(l.amount, quote.currency)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-3 text-lg font-medium">
            <dt>Total</dt>
            <dd>{formatMoney(quote.total, quote.currency)}</dd>
          </div>
        </dl>
        {footer}
      </div>
    </aside>
  );
}
