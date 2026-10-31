import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { formatDate } from "@/lib/dates";
import { getBooking, getSite } from "@/lib/pms";
import { bookingToken } from "@/lib/validation";
import { CheckoutSteps, StaySummary } from "@/themes/escape/checkout";

export const metadata: Metadata = { title: "Booking confirmed", robots: { index: false, follow: false } };

const METHOD_LABEL = { upi: "UPI", card: "Card", netbanking: "Net banking" } as const;

export default function ConfirmationPage({ params }: PageProps<"/[site]/booking/[token]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
      <CheckoutSteps current={2} />
      <Suspense fallback={<div className="mt-8 h-[28rem] animate-pulse rounded-3xl bg-sand-deep" />}>
        <Confirmation params={params} />
      </Suspense>
    </div>
  );
}

async function Confirmation({ params }: Pick<PageProps<"/[site]/booking/[token]">, "params">) {
  const { site: key, token } = await params;
  const booking = bookingToken.safeParse(token).success ? await getBooking(key, token) : null;
  const site = await getSite(key);

  if (!booking || !site) {
    return (
      <div className="mt-8 rounded-3xl border border-line bg-white/80 p-8">
        <p>We couldn’t find this booking. Please check the link in your confirmation email, or contact us.</p>
      </div>
    );
  }
  if (booking.status === "pending_payment") redirect(`/checkout/${encodeURIComponent(token)}`);

  const mapsUrl = site.location
    ? `https://www.google.com/maps/search/?api=1&query=${site.location.lat},${site.location.lng}`
    : null;
  const whatsapp = site.contact.whatsapp?.replace(/\D/g, "");

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px] lg:gap-12">
      <section>
        <div className="relative overflow-hidden rounded-3xl bg-brand p-8 text-white sm:p-10">
          <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div aria-hidden className="absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-accent/40" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand">
            <Icon name="check" className="h-7 w-7" strokeWidth={2.5} />
          </span>
          <h1 className="relative mt-6 font-display text-3xl tracking-tight sm:text-4xl">
            {booking.status === "confirmed" ? `You’re going to ${booking.listing.name}!` : "This booking is no longer active"}
          </h1>
          <p className="relative mt-3 max-w-lg text-white/80">
            {booking.status === "confirmed"
              ? `Thank you, ${booking.guestName.split(" ")[0]}. Your booking is confirmed and the details are on their way to ${booking.guestEmailMasked}.`
              : "Please contact us if you think this is a mistake."}
          </p>
          <div className="relative mt-6 inline-flex items-center gap-3 rounded-full bg-white/15 px-4 py-2 text-sm">
            Booking reference <span className="font-mono text-base font-medium tracking-wider">{booking.reference}</span>
          </div>
        </div>

        {booking.status === "confirmed" && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Fact icon="key" label="Check-in" value={`${formatDate(booking.checkIn, { weekday: "short", day: "numeric", month: "short" })}, from ${site.policies.checkInTime}`} />
              <Fact icon="sun" label="Check-out" value={`${formatDate(booking.checkOut, { weekday: "short", day: "numeric", month: "short" })}, by ${site.policies.checkOutTime}`} />
              <Fact
                icon="wallet"
                label="Payment"
                value={
                  booking.payment.mode === "simulated"
                    ? "Arranged with host"
                    : `Paid${booking.payment.method ? ` by ${METHOD_LABEL[booking.payment.method]}` : ""}`
                }
              />
            </div>

            <div className="mt-6 rounded-3xl border border-line bg-white/80 p-6 sm:p-8">
              <h2 className="font-display text-xl">What happens next</h2>
              <ol className="mt-5 space-y-5">
                {[
                  ["mail", "Check your inbox", "Your confirmation and receipt are on the way. Keep the booking reference handy."],
                  ["chat", "We’ll be in touch", "A day before arrival we’ll send directions and the caretaker’s number."],
                  ["key", "Arrive and relax", `Check-in is from ${site.policies.checkInTime}. Bring a photo ID for each adult guest.`],
                ].map(([icon, title, text]) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                      <Icon name={icon} />
                    </span>
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-ink-soft">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-8 flex flex-wrap gap-3">
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-medium hover:bg-sand">
                    <Icon name="pin" className="h-4 w-4" /> Get directions
                  </a>
                )}
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello! Booking ${booking.reference}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-medium hover:bg-sand"
                  >
                    <Icon name="chat" className="h-4 w-4" /> Message the host
                  </a>
                )}
                <Link href="/" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-ink-soft hover:text-ink">
                  Back to home
                </Link>
              </div>
            </div>
          </>
        )}
      </section>

      <StaySummary
        name={booking.listing.name}
        propertyName={booking.listing.propertyName}
        image={booking.listing.image}
        checkIn={booking.checkIn}
        checkOut={booking.checkOut}
        guests={booking.guests}
        quote={booking.quote}
        footer={<p className="mt-5 rounded-xl bg-sand-deep px-4 py-3 text-xs leading-relaxed text-ink-soft">{site.policies.cancellation}</p>}
      />
    </div>
  );
}

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white/80 p-4">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
        <Icon name={icon} className="h-4 w-4" /> {label}
      </p>
      <p className="mt-1.5 font-medium">{value}</p>
    </div>
  );
}
