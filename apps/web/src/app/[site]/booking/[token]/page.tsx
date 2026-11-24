import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { Icon } from "@/components/icons";
import { ManageBooking } from "@/components/manage-booking";
import { formatDate, formatMoney, todayIn } from "@/lib/dates";
import { getBooking, getListing, getSite } from "@/lib/pms";
import { bookingToken } from "@/lib/validation";
import { StaySummary } from "@/themes/escape/checkout";

export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };

const METHOD_LABEL = { upi: "UPI", card: "Card", netbanking: "Net banking" } as const;

export default function ConfirmationPage({ params }: PageProps<"/[site]/booking/[token]">) {
  return (
    <div className="mx-auto max-w-[1064px] px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
      <Suspense fallback={<div className="mt-8 h-[28rem] animate-pulse rounded-3xl bg-sand-deep" />}>
        <Confirmation params={params} />
      </Suspense>
    </div>
  );
}

async function Confirmation({ params }: Pick<PageProps<"/[site]/booking/[token]">, "params">) {
  // Booking status is live: always render at request time.
  await connection();
  const { site: key, token } = await params;
  const booking = bookingToken.safeParse(token).success ? await getBooking(key, token) : null;
  const site = await getSite(key);

  if (!booking || !site) {
    return (
      <div className="mt-8 rounded-2xl border border-line p-6 sm:p-8">
        <p>We couldn’t find this booking. Please check the link in your confirmation email, or contact us.</p>
      </div>
    );
  }
  if (booking.status === "pending_payment") redirect(`/checkout/${encodeURIComponent(token)}`);
  const listing = booking.listing.slug ? await getListing(key, booking.listing.slug) : null;
  const cancelled = booking.status === "cancelled";
  const past = booking.status === "confirmed" && booking.checkOut < todayIn(site.timezone);
  // With online payment off nothing was taken, so there is never anything to refund.
  const simulated = booking.payment.mode === "simulated";

  // The booked home's own place. Never the site's: that can be in another city.
  const at = listing?.location;
  const mapsUrl = at ? `https://www.google.com/maps/search/?api=1&query=${at.lat},${at.lng}` : null;
  const whatsapp = site.contact.whatsapp?.replace(/\D/g, "");

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_372px] lg:gap-20">
      <section>
        <div>
          <p className={`flex items-center gap-3 font-medium ${booking.status === "confirmed" ? "" : "text-ink-soft"}`}>
            <span aria-hidden className={`grid h-10 w-10 place-items-center rounded-full text-white ${booking.status === "confirmed" ? "bg-brand" : "bg-ink-soft"}`}>
              <Icon name={booking.status === "confirmed" ? "check" : "close"} className="h-5 w-5" strokeWidth={2.5} />
            </span>
            {past ? "Past stay" : booking.status === "confirmed" ? "Booking confirmed" : cancelled ? "Cancelled" : "Not active"}
          </p>
          <h1 className="mt-5 text-[1.75rem] leading-tight sm:text-[2rem]">
            {past ? `Your stay at ${booking.listing.name}` : booking.status === "confirmed" ? `You’re going to ${booking.listing.name}!` : cancelled ? "This booking is cancelled" : "This booking is no longer active"}
          </h1>
          <p className="mt-3 max-w-lg text-ink-soft">
            {past
              ? `Thank you for staying with us, ${booking.guestName.split(" ")[0]}.`
              : booking.status === "confirmed"
              ? `Thank you, ${booking.guestName.split(" ")[0]}. Your booking is confirmed and the details are on their way to ${booking.guestEmailMasked}.`
              : cancelled
                ? simulated
                  ? "The dates are released. You hadn’t paid online, so there is nothing to refund."
                  : `The dates are released. Any refund is shown in the email we sent to ${booking.guestEmailMasked}.`
                : "Please contact us if you think this is a mistake."}
          </p>
          <div className="mt-5 inline-flex flex-wrap items-center gap-x-3 rounded-xl bg-sand-deep px-4 py-2.5 text-sm">
            Booking reference <span className="font-mono text-base font-medium tracking-wider">{booking.reference}</span>
          </div>
        </div>

        {booking.status === "confirmed" && (
          <>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              <Fact icon="key" label="Check-in" value={`${formatDate(booking.checkIn, { weekday: "short", day: "numeric", month: "short" })}, from ${site.policies.checkInTime}`} />
              <Fact icon="sun" label="Check-out" value={`${formatDate(booking.checkOut, { weekday: "short", day: "numeric", month: "short" })}, by ${site.policies.checkOutTime}`} />
              <Fact
                icon="wallet"
                label="Payment"
                value={
                  simulated
                    ? "Arranged with host"
                    : `Paid${booking.payment.method ? ` by ${METHOD_LABEL[booking.payment.method]}` : ""}`
                }
              />
            </div>

            {past && (
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/review/${encodeURIComponent(token)}`} className="inline-flex min-h-12 items-center rounded-xl bg-brand px-6 font-medium text-white">
                  Write a review
                </Link>
                <Link href={`/stays/${booking.listing.slug}`} className="inline-flex min-h-12 items-center rounded-xl px-6 font-medium ring-1 ring-line hover:bg-sand-deep">
                  Book again
                </Link>
                <Link href={`/booking/${encodeURIComponent(token)}/receipt`} className="inline-flex min-h-12 items-center rounded-xl px-6 font-medium ring-1 ring-line hover:bg-sand-deep">
                  Receipt
                </Link>
              </div>
            )}

            <div className={past ? "hidden" : "mt-10 border-t border-line pt-8"}>
              <h2 className="text-h2">What happens next</h2>
              <ol className="mt-5 space-y-5">
                {[
                  ["mail", "Check your inbox", "Your confirmation and receipt are on the way. Keep the booking reference handy."],
                  ["chat", "We’ll be in touch", "A day before arrival we’ll send directions and how to get in."],
                  ["key", "Arrive and relax", `Check-in is from ${site.policies.checkInTime}. Bring a photo ID for each adult guest.`],
                ].map(([icon, title, text]) => (
                  <li key={title} className="flex gap-4">
                    <Icon name={icon} className="mt-0.5 h-6 w-6 shrink-0 text-accent" />
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-ink-soft">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-8 flex flex-wrap gap-3">
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-2.5 text-sm font-medium hover:bg-sand">
                    <Icon name="pin" className="h-4 w-4" /> Get directions
                  </a>
                )}
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello! Booking ${booking.reference}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-2.5 text-sm font-medium hover:bg-sand"
                  >
                    <Icon name="chat" className="h-4 w-4" /> Message the host
                  </a>
                )}
                <Link href="/" className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-ink-soft hover:text-ink">
                  Back to home
                </Link>
              </div>
            </div>

            {booking.manage && !past && (
              <ManageBooking
                token={token}
                listingId={booking.quote.listingId}
                checkIn={booking.checkIn}
                checkOut={booking.checkOut}
                guests={booking.guests}
                total={booking.quote.total}
                currency={booking.quote.currency}
                timezone={site.timezone}
                manage={booking.manage}
                paid={booking.payment.status === "paid" && !simulated}
                minNights={listing?.minNights ?? 1}
                maxNights={listing?.maxNights ?? 30}
              />
            )}
          </>
        )}

        {cancelled && (
          <p className="mt-6 text-sm text-ink-soft">
            Total was {formatMoney(booking.quote.total, booking.quote.currency)}.{" "}
            <Link href={`/booking/${encodeURIComponent(token)}/receipt`} className="underline underline-offset-4">
              View receipt
            </Link>
          </p>
        )}
      </section>

      <StaySummary
        phoneFirst={false}
        name={booking.listing.name}
        propertyName={booking.listing.propertyName}
        image={booking.listing.image}
        rating={listing?.rating}
        checkIn={booking.checkIn}
        checkOut={booking.checkOut}
        guests={booking.guests}
        quote={booking.quote}
        cancellation={site.policies.cancellation}
      />
    </div>
  );
}

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="border-t border-line pt-3">
      <p className="text-eyebrow flex items-center gap-2 uppercase text-ink-soft">
        <Icon name={icon} className="h-4 w-4" /> {label}
      </p>
      <p className="mt-1.5 font-medium">{value}</p>
    </div>
  );
}
