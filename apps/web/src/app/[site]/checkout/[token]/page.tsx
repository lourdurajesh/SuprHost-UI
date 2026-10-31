import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PaymentPanel } from "@/components/payment-panel";
import { getBooking, getSite } from "@/lib/pms";
import { bookingToken } from "@/lib/validation";
import { CheckoutSteps, StaySummary } from "@/themes/escape/checkout";

// Holder-of-token page: never indexed, never cached, and the token never leaves this origin in
// a Referer (Referrer-Policy: strict-origin-when-cross-origin sends the origin only).
export const metadata: Metadata = { title: "Payment", robots: { index: false, follow: false } };

export default function CheckoutPage({ params }: PageProps<"/[site]/checkout/[token]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
      <CheckoutSteps current={1} />
      <h1 className="mt-6 font-display text-3xl tracking-tight sm:text-4xl">Payment</h1>
      <Suspense fallback={<div className="mt-8 h-[28rem] animate-pulse rounded-3xl bg-sand-deep" />}>
        <CheckoutContent params={params} />
      </Suspense>
    </div>
  );
}

async function CheckoutContent({ params }: Pick<PageProps<"/[site]/checkout/[token]">, "params">) {
  const { site: key, token } = await params;
  const booking = bookingToken.safeParse(token).success ? await getBooking(key, token) : null;
  const site = await getSite(key);

  if (!booking || !site) return <Gone message="We couldn’t find this reservation." />;
  if (booking.status === "confirmed") redirect(`/booking/${encodeURIComponent(token)}`);
  if (booking.status !== "pending_payment" || !booking.holdExpiresAt) {
    return (
      <Gone
        message="Your hold on these dates has expired, so they’ve been released. You haven’t been charged."
        href={`/stays/${booking.listing.slug}`}
      />
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px] lg:gap-12">
      <section className="rounded-3xl border border-line bg-white/80 p-6 sm:p-8">
        <p className="text-sm text-ink-soft">
          Reservation <span className="font-mono font-medium text-ink">{booking.reference}</span> for {booking.guestName}
        </p>
        <div className="mt-5">
          <PaymentPanel
            token={token}
            total={booking.quote.total}
            currency={booking.quote.currency}
            methods={booking.paymentMethods}
            holdExpiresAt={booking.holdExpiresAt}
            simulated={booking.payment.mode === "simulated"}
          />
        </div>
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

function Gone({ message, href = "/#stays" }: { message: string; href?: string }) {
  return (
    <div className="mt-8 rounded-3xl border border-line bg-white/80 p-8">
      <p>{message}</p>
      <Link href={href} className="mt-5 inline-flex rounded-full bg-brand px-6 py-3 font-medium text-white">
        Choose dates again
      </Link>
    </div>
  );
}
