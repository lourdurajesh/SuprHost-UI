import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { getGuestSession, getListings, getQuote, getSite, PmsError } from "@/lib/pms";
import { readSessionToken } from "@/lib/session";
import { stayQuery } from "@/lib/validation";
import { CheckoutSteps, StaySummary } from "@/themes/escape/checkout";

export const metadata: Metadata = { title: "Confirm and pay", robots: { index: false, follow: false } };

export default function BookPage({ params, searchParams }: PageProps<"/[site]/book">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
      <CheckoutSteps current={0} />
      <h1 className="mt-6 text-h1">Confirm and pay</h1>
      <Suspense fallback={<div className="mt-8 h-[28rem] animate-pulse rounded-2xl bg-sand-deep" />}>
        <BookContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
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

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px] lg:gap-12">
      <section>
        <h2 className="text-h2">Who’s staying?</h2>
        <p className="mt-1 text-ink-soft">
          {session ? "Check your details. Your confirmation and check-in details go to this email." : "Your details become your guest account, so you can find this booking and book faster next time."}
        </p>
        <div className="mt-6">
          <CheckoutForm
            listingId={listing.id}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            holdMinutes={site.payments.holdMinutes}
            session={session}
          />
        </div>
      </section>

      <StaySummary
        name={listing.name}
        propertyName={listing.propertyName}
        image={listing.image}
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guests}
        quote={quote}
        footer={
          <>
            <p className="mt-5 rounded-xl bg-sand-deep px-4 py-3 text-xs leading-relaxed text-ink-soft">{site.policies.cancellation}</p>
            <Link href={`/stays/${listing.slug}`} className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
              Change dates or guests
            </Link>
          </>
        }
      />
    </div>
  );
}

function StartOver({ message, href = "/#stays" }: { message: string; href?: string }) {
  return (
    <div className="mt-8 rounded-2xl border border-line p-6 sm:p-8">
      <p>{message}</p>
      <Link href={href} className="mt-5 inline-flex rounded-full bg-brand px-6 py-3 font-medium text-white">
        Choose dates
      </Link>
    </div>
  );
}
