import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { RequestSteps } from "@/components/request-steps";
import { Track } from "@/components/track";
import { getGuestSession, getListing, getListings, getQuote, getSite, PmsError } from "@/lib/pms";
import { formatDate } from "@/lib/dates";
import { stayUrl } from "@/lib/links";
import { readSessionToken } from "@/lib/session";
import { stayQuery } from "@/lib/validation";
import { ChangeDates, ChangeGuests } from "@/components/change-stay";
import { StepCard } from "@/components/step-card";
import { buttonClass } from "@/components/ui/button";
import { checkoutGrid, CheckoutShell, StaySummary } from "@/themes/escape/checkout";

export const metadata: Metadata = { title: "Your details", robots: { index: false, follow: false } };

export default function BookPage({ params, searchParams }: PageProps<"/[site]/book">) {
  return (
    <>
      <Track step="checkout" />
      <Suspense
        fallback={
          <CheckoutShell title="Confirm and book" back="/stays">
            <div className="mt-8 h-[28rem] animate-pulse rounded-2xl bg-sand-deep" />
          </CheckoutShell>
        }
      >
        <BookContent params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function BookContent({ params, searchParams }: Pick<PageProps<"/[site]/book">, "params" | "searchParams">) {
  const { site: key } = await params;
  const parsed = stayQuery.safeParse(await searchParams);
  const sessionToken = await readSessionToken();
  const [site, listings, session] = await Promise.all([
    getSite(key),
    getListings(key),
    sessionToken ? getGuestSession(key, sessionToken).catch(() => null) : null,
  ]);
  const listing = parsed.success ? listings.find((l) => l.id === parsed.data.listing) : undefined;

  if (!site || !parsed.success || !listing || parsed.data.guests > listing.maxGuests) {
    return <StartOver message="This booking link is incomplete or out of date." />;
  }

  const { checkIn, checkOut, guests } = parsed.data;
  let quote;
  try {
    quote = await getQuote(key, listing.id, checkIn, checkOut, guests);
  } catch (e) {
    if (e instanceof PmsError && e.status < 500) {
      return <StartOver message="These dates are no longer available. Please choose other dates." href={stayUrl(listing.slug)} />;
    }
    throw e;
  }

  const full = await getListing(key, listing.slug);
  const stay = { listingId: listing.id, checkIn, checkOut, guests };
  const back = stayUrl(listing.slug, stay);
  const phoneSignIn = site.features.includes("guest.phone_sign_in");
  // Without instant booking the host accepts first: the guest sends a request, and pays only after a yes.
  const request = !listing.instantBook;
  const rules = [...new Set([...site.policies.houseRules, ...(full?.houseRules ?? [])])];
  const day = (iso: string) => formatDate(iso, { weekday: "short", day: "numeric", month: "short" });

  return (
    <CheckoutShell title={request ? "Request to book" : "Confirm and book"} back={back}>
      <div className={checkoutGrid}>
        {request ? (
          <RequestSteps
            listingId={listing.id}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            session={session}
            phoneSignIn={phoneSignIn}
            hours={site.payments.requestHours ?? 24}
            simulated={site.payments.mode === "simulated"}
            methods={site.payments.methods}
            review={
              <div className="space-y-5 text-sm">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="font-medium">Check-in</dt>
                    <dd className="text-ink-soft">
                      {day(checkIn)}, from {site.policies.checkInTime}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Check-out</dt>
                    <dd className="text-ink-soft">
                      {day(checkOut)}, by {site.policies.checkOutTime}
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
                  By sending this request you agree to the house rules and the{" "}
                  <Link href="/policies" target="_blank" className="font-medium text-ink underline underline-offset-4">
                    booking policies
                  </Link>
                  . Please bring a photo ID for each adult guest.
                </p>
              </div>
            }
          />
        ) : (
          <div className="space-y-5">
            <StepCard n={1} title="Your details" state="open">
              <CheckoutForm
                listingId={listing.id}
                checkIn={checkIn}
                checkOut={checkOut}
                guests={guests}
                holdMinutes={site.payments.holdMinutes}
                session={session}
                phoneSignIn={phoneSignIn}
              />
            </StepCard>
            <StepCard n={2} title="Choose how to pay" state="todo" />
            <StepCard n={3} title="Review your booking" state="todo" />
          </div>
        )}

        <StaySummary
          name={listing.name}
          propertyName={listing.propertyName}
          image={listing.image}
          rating={listing.rating}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          quote={quote}
          cancellation={site.policies.cancellation}
          changeDates={<ChangeDates stay={stay} timezone={site.timezone} minNights={full?.minNights ?? 1} maxNights={full?.maxNights ?? 60} />}
          changeGuests={<ChangeGuests stay={stay} maxGuests={listing.maxGuests} />}
        />
      </div>
    </CheckoutShell>
  );
}

function StartOver({ message, href = "/stays" }: { message: string; href?: string }) {
  return (
    <CheckoutShell title="Confirm and book" back={href}>
      <div className="mt-8 rounded-2xl border border-line p-6 sm:p-8">
        <p>{message}</p>
        <Link href={href} className={`${buttonClass()} mt-5`}>
          Choose dates
        </Link>
      </div>
    </CheckoutShell>
  );
}
