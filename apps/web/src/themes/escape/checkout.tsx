import Link from "next/link";
import type { BookingSummary, ListingImage, Quote, RatingSummary } from "@/lib/pms";
import { formatMoney, stayDates } from "@/lib/dates";
import { plural } from "@/lib/text";
import { Icon } from "@/components/icons";
import { MoreDialog } from "@/components/more-dialog";
import { PriceBreakdown } from "@/components/price-breakdown";
import { Rating } from "@/components/rating";
import { ListingPhoto } from "./listing-media";

/** The checkout's page: a back arrow and a title, the steps on the left, the stay on the right. */
export function CheckoutShell({ title, back, children }: { title: string; back: string; children: React.ReactNode }) {
  return (
    // data-booking-flow: the header keeps only the brand (globals.css).
    <div data-booking-flow className="mx-auto max-w-[1064px] px-4 pb-16 pt-6 sm:px-6 lg:pt-10">
      <div className="flex items-center gap-4 xl:-ml-16">
        <Link href={back} aria-label="Back" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand-deep transition hover:brightness-95">
          <Icon name="arrowLeft" className="h-4 w-4" />
        </Link>
        <h1 className="text-[1.75rem] leading-tight sm:text-[2rem]">{title}</h1>
      </div>
      {children}
    </div>
  );
}

/** Steps and summary side by side; on phones the summary comes first, folded to one line. */
export const checkoutGrid = "mt-6 grid items-start gap-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_372px] lg:gap-20";

/** What the summary shows of a booking that has been made. */
export const summaryOf = ({ listing, checkIn, checkOut, guests, quote }: BookingSummary) => ({
  name: listing.name,
  propertyName: listing.propertyName,
  image: listing.image,
  checkIn,
  checkOut,
  guests,
  quote,
});

export function StaySummary({
  name,
  propertyName,
  image,
  rating,
  checkIn,
  checkOut,
  guests,
  quote,
  cancellation,
  changeDates,
  changeGuests,
  phoneFirst = true,
}: {
  name: string;
  propertyName: string;
  image: ListingImage | null;
  rating?: RatingSummary | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  quote: Quote;
  cancellation: string;
  /** "Change" buttons, while the dates can still be changed here. */
  changeDates?: React.ReactNode;
  changeGuests?: React.ReactNode;
  /** Above the main column on phones (checkout: "what am I booking?"); false keeps it after (confirmation). */
  phoneFirst?: boolean;
}) {
  const row = "flex items-center justify-between gap-4 border-t border-line py-4";
  const guestText = plural(guests, "guest");
  const details = (
    <>
      <div className="py-4">
        <p className="text-sm font-medium">Cancellation</p>
        {cancellation.length > 110 ? (
          <>
            <p className="line-clamp-2 text-sm text-ink-soft">{cancellation}</p>
            <MoreDialog label="Full policy" title="Cancellation policy" variant="link">
              <p>{cancellation}</p>
            </MoreDialog>
          </>
        ) : (
          <p className="text-sm text-ink-soft">{cancellation}</p>
        )}
      </div>
      <div className={row}>
        <div>
          <p className="text-sm font-medium">Dates</p>
          <p className="text-sm">{stayDates(checkIn, checkOut)}</p>
        </div>
        {changeDates}
      </div>
      <div className={row}>
        <div>
          <p className="text-sm font-medium">Guests</p>
          <p className="text-sm">{guestText}</p>
        </div>
        {changeGuests}
      </div>
      <div className="border-t border-line pt-4">
        <p className="mb-2 text-sm font-medium">Price details</p>
        <PriceBreakdown quote={quote} />
      </div>
    </>
  );
  return (
    <>
      {phoneFirst && (
        <details className="order-first rounded-2xl border border-line bg-white lg:hidden [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-3">
            <ListingPhoto image={image} name="" sizes="56px" className="h-14 w-14 shrink-0 rounded-lg" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{name}</span>
              <span className="block truncate text-sm text-ink-soft">
                {stayDates(checkIn, checkOut)} · {guestText}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-medium">{formatMoney(quote.total, quote.currency)}</span>
              <span className="block text-sm text-ink-soft underline underline-offset-4">Details</span>
            </span>
          </summary>
          <div className="border-t border-line px-4 pb-4">{details}</div>
        </details>
      )}
      <aside aria-label="Your stay" className={`${phoneFirst ? "max-lg:hidden" : ""} rounded-2xl border border-line bg-white p-6 lg:sticky lg:top-[100px]`}>
        <div className="flex gap-4">
          <ListingPhoto image={image} name="" sizes="112px" className="h-24 w-24 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <p className="line-clamp-3 font-medium leading-snug">{name}</p>
            <p className="mt-1 text-sm text-ink-soft">{propertyName}</p>
            <Rating rating={rating} className="mt-1 text-sm" />
          </div>
        </div>
        {details}
      </aside>
    </>
  );
}
