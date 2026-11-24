import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { Track } from "@/components/track";
import { getGuestSession, getListing, getListings, getQuote, getSite, PmsError } from "@/lib/pms";
import { readSessionToken } from "@/lib/session";
import { stayQuery } from "@/lib/validation";
import { ChangeDates, ChangeGuests } from "@/components/change-stay";
import { StepCard } from "@/components/step-card";
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
      return <StartOver message="These dates are no longer available. Please choose other dates." href={`/stays/${listing.slug}`} />;
    }
    throw e;
  }

  const full = await getListing(key, listing.slug);
  const stay = { listingId: listing.id, checkIn, checkOut, guests };
  const back = `/stays/${listing.slug}?${new URLSearchParams({ checkIn, checkOut, guests: String(guests) })}`;

  return (
    <CheckoutShell title="Confirm and book" back={back}>
      <div className={checkoutGrid}>
        <div className="space-y-5">
          <StepCard n={1} title="Your details" state="open">
            <CheckoutForm
              listingId={listing.id}
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
              holdMinutes={site.payments.holdMinutes}
              session={session}
              phoneSignIn={site.features.includes("guest.phone_sign_in")}
            />
          </StepCard>
          <StepCard n={2} title="Choose how to pay" state="todo" />
          <StepCard n={3} title="Review your booking" state="todo" />
        </div>

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
        <Link href={href} className="mt-5 inline-flex rounded-xl bg-brand px-6 py-3 font-medium text-white">
          Choose dates
        </Link>
      </div>
    </CheckoutShell>
  );
}
