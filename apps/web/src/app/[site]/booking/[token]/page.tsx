import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { Icon } from "@/components/icons";
import { ManageBooking } from "@/components/manage-booking";
import { WithdrawRequest } from "@/components/withdraw-request";
import { formatDate, formatMoney, todayIn } from "@/lib/dates";
import { bookingUrl, mapsUrl, stayUrl, whatsappUrl } from "@/lib/links";
import { getBooking, getListing, getSite } from "@/lib/pms";
import type { BookingSummary, Site } from "@/lib/pms/types";
import { bookingToken } from "@/lib/validation";
import { buttonClass } from "@/components/ui/button";
import { StaySummary, summaryOf } from "@/themes/escape/checkout";

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
  if (booking.status === "awaiting_host" || booking.status === "declined" || booking.status === "withdrawn") {
    const listing = booking.listing.slug ? await getListing(key, booking.listing.slug) : null;
    return <RequestState booking={booking} site={site} token={token} rating={listing?.rating} />;
  }
  const listing = booking.listing.slug ? await getListing(key, booking.listing.slug) : null;
  const cancelled = booking.status === "cancelled";
  const past = booking.status === "confirmed" && booking.checkOut < todayIn(site.timezone);
  // With online payment off nothing was taken, so there is never anything to refund.
  const simulated = booking.payment.mode === "simulated";

  // The booked home's own place. Never the site's: that can be in another city.
  const directions = mapsUrl(listing?.location);
  const message = whatsappUrl(site.contact.whatsapp, `Hello! Booking ${booking.reference}`);

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
                <Link href={`/review/${encodeURIComponent(token)}`} className={buttonClass()}>
                  Write a review
                </Link>
                <Link href={stayUrl(booking.listing.slug)} className={buttonClass("outline")}>
                  Book again
                </Link>
                <Link href={bookingUrl(token, "receipt")} className={buttonClass("outline")}>
                  Receipt
                </Link>
              </div>
            )}

            {!past && (
              <div className="mt-10 border-t border-line pt-8">
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
                  {directions && (
                    <a href={directions} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>
                      <Icon name="pin" className="h-4 w-4" /> Get directions
                    </a>
                  )}
                  {message && (
                    <a href={message} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>
                      <Icon name="chat" className="h-4 w-4" /> Message the host
                    </a>
                  )}
                  <Link href="/" className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-ink-soft hover:text-ink">
                    Back to home
                  </Link>
                </div>
              </div>
            )}

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
            <Link href={bookingUrl(token, "receipt")} className="underline underline-offset-4">
              View receipt
            </Link>
          </p>
        )}
      </section>

      <StaySummary {...summaryOf(booking)} rating={listing?.rating} cancellation={site.policies.cancellation} phoneFirst={false} />
    </div>
  );
}

/** A request to book: waiting for the host, declined (or unanswered in time), or withdrawn by the guest. */
function RequestState({ booking, site, token, rating }: { booking: BookingSummary; site: Site; token: string; rating?: Parameters<typeof StaySummary>[0]["rating"] }) {
  const first = booking.guestName.split(" ")[0];
  const waiting = booking.status === "awaiting_host";
  const lapsed = booking.request?.lapsed ?? false;
  const replyBy = booking.holdExpiresAt
    ? new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: site.timezone })
        .format(new Date(booking.holdExpiresAt))
    : null;
  const message = whatsappUrl(site.contact.whatsapp, `Hello! About my request ${booking.reference}`);
  const label = waiting ? "Request sent" : booking.status === "withdrawn" ? "Request withdrawn" : lapsed ? "Request ended" : "Request not accepted";
  const title = waiting
    ? "Your request is with the host"
    : booking.status === "withdrawn"
      ? "You withdrew this request"
      : lapsed
        ? "The host couldn’t reply in time"
        : "The host can’t take this booking";
  const text = waiting
    ? `Thank you, ${first}. The host will reply${replyBy ? ` by ${replyBy}` : " soon"}. Your dates are held until then, and nothing is charged unless they accept. We’ll let you know at ${booking.guestEmailMasked}.`
    : booking.status === "withdrawn"
      ? "The dates are released and nothing was charged."
      : "Nothing was charged, and the dates are open again. You’re welcome to try other dates or another stay.";

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_372px] lg:gap-20">
      <section>
        <p className={`flex items-center gap-3 font-medium ${waiting ? "" : "text-ink-soft"}`}>
          <span aria-hidden className={`grid h-10 w-10 place-items-center rounded-full text-white ${waiting ? "bg-brand" : "bg-ink-soft"}`}>
            <Icon name={waiting ? "clock" : "close"} className="h-5 w-5" strokeWidth={2.5} />
          </span>
          {label}
        </p>
        <h1 className="mt-5 text-[1.75rem] leading-tight sm:text-[2rem]">{title}</h1>
        <p className="mt-3 max-w-lg text-ink-soft">{text}</p>
        {booking.request?.hostNote && (
          <blockquote className="mt-5 max-w-lg border-l-2 border-line pl-4 text-ink-soft">
            <p className="text-sm font-medium text-ink">The host says</p>
            <p className="mt-1">“{booking.request.hostNote}”</p>
          </blockquote>
        )}
        <div className="mt-5 inline-flex flex-wrap items-center gap-x-3 rounded-xl bg-sand-deep px-4 py-2.5 text-sm">
          Request reference <span className="font-mono text-base font-medium tracking-wider">{booking.reference}</span>
        </div>

        {waiting ? (
          <>
            <div className="mt-10 border-t border-line pt-8">
              <h2 className="text-h2">What happens next</h2>
              <ol className="mt-5 space-y-5">
                {[
                  ["clock", "The host reviews your request", replyBy ? `They have until ${replyBy} to accept or decline.` : "They’ll accept or decline shortly."],
                  ["check", "If they accept", "Your booking is confirmed and you get the details by email."],
                  ["close", "If they can’t", "Nothing is charged and the dates open again."],
                ].map(([icon, title, body]) => (
                  <li key={title} className="flex gap-4">
                    <Icon name={icon} className="mt-0.5 h-6 w-6 shrink-0 text-accent" />
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-ink-soft">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {message && (
                <a href={message} target="_blank" rel="noopener noreferrer" className={`${buttonClass("outline", "sm")} mt-8`}>
                  <Icon name="chat" className="h-4 w-4" /> Message the host
                </a>
              )}
            </div>
            {booking.manage?.canCancel && <WithdrawRequest token={token} />}
          </>
        ) : (
          <div className="mt-8 flex flex-wrap gap-3">
            {booking.listing.slug && (
              <Link href={stayUrl(booking.listing.slug)} className={buttonClass()}>
                Try other dates
              </Link>
            )}
            <Link href="/stays" className={buttonClass("outline")}>
              See all stays
            </Link>
          </div>
        )}
      </section>

      <StaySummary {...summaryOf(booking)} rating={rating} cancellation={site.policies.cancellation} phoneFirst={false} />
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
