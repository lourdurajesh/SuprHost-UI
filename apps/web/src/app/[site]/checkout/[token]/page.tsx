import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { PaymentSteps } from "@/components/payment-steps";
import { getBooking, getListing, getSite } from "@/lib/pms";
import { formatDate } from "@/lib/dates";
import { bookingToken } from "@/lib/validation";
import { checkoutGrid, CheckoutShell, StaySummary } from "@/themes/escape/checkout";

// Holder-of-token page: never indexed, never cached, and the token never leaves this origin in
// a Referer (Referrer-Policy: strict-origin-when-cross-origin sends the origin only).
export const metadata: Metadata = { title: "Payment", robots: { index: false, follow: false } };

export default function CheckoutPage({ params }: PageProps<"/[site]/checkout/[token]">) {
  return (
    <Suspense
      fallback={
        <CheckoutShell title="Confirm and pay" back="/stays">
          <div className="mt-8 h-[28rem] animate-pulse rounded-2xl bg-sand-deep" />
        </CheckoutShell>
      }
    >
      <CheckoutContent params={params} />
    </Suspense>
  );
}

async function CheckoutContent({ params }: Pick<PageProps<"/[site]/checkout/[token]">, "params">) {
  // A hold's countdown and status are live: always render at request time.
  await connection();
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

  const listing = booking.listing.slug ? await getListing(key, booking.listing.slug) : null;
  const rules = [...new Set([...site.policies.houseRules, ...(listing?.houseRules ?? [])])];
  const simulated = booking.payment.mode === "simulated";
  const day = (iso: string) => formatDate(iso, { weekday: "short", day: "numeric", month: "short" });

  return (
    <CheckoutShell title={simulated ? "Confirm your booking" : "Confirm and pay"} back={`/stays/${booking.listing.slug}`}>
      <div className={checkoutGrid}>
        <PaymentSteps
          token={token}
          guestName={booking.guestName}
          reference={booking.reference}
          total={booking.quote.total}
          currency={booking.quote.currency}
          methods={booking.paymentMethods}
          holdExpiresAt={booking.holdExpiresAt}
          simulated={simulated}
          review={
            <div className="space-y-5 text-sm">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="font-medium">Check-in</dt>
                  <dd className="text-ink-soft">
                    {day(booking.checkIn)}, from {site.policies.checkInTime}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Check-out</dt>
                  <dd className="text-ink-soft">
                    {day(booking.checkOut)}, by {site.policies.checkOutTime}
                  </dd>
                </div>
              </dl>
              {rules.length > 0 && (
                <div>
                  <p className="font-medium">House rules</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-soft">
                    {rules.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="border-t border-line pt-5 text-ink-soft">
                By continuing you agree to the house rules and the{" "}
                <Link href="/policies" target="_blank" className="font-medium text-ink underline underline-offset-4">
                  booking policies
                </Link>
                . Please bring a photo ID for each adult guest.
              </p>
            </div>
          }
        />

        <StaySummary
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
    </CheckoutShell>
  );
}

function Gone({ message, href = "/stays" }: { message: string; href?: string }) {
  return (
    <CheckoutShell title="Confirm and pay" back={href}>
      <div className="mt-8 rounded-2xl border border-line p-6 sm:p-8">
        <p>{message}</p>
        <Link href={href} className="mt-5 inline-flex rounded-xl bg-brand px-6 py-3 font-medium text-white">
          Choose dates again
        </Link>
      </div>
    </CheckoutShell>
  );
}
