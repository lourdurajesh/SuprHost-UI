import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { getListings, getQuote, getSite, PmsError } from "@/lib/pms";
import { stayQuery } from "@/lib/validation";
import { CheckoutSteps, StaySummary } from "@/themes/escape/checkout";

export const metadata: Metadata = { title: "Confirm and pay", robots: { index: false, follow: false } };

export default function BookPage({ params, searchParams }: PageProps<"/[site]/book">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
      <CheckoutSteps current={0} />
      <h1 className="mt-6 font-display text-3xl tracking-tight sm:text-4xl">Confirm and pay</h1>
      <Suspense fallback={<div className="mt-8 h-[28rem] animate-pulse rounded-3xl bg-sand-deep" />}>
        <BookContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function BookContent({ params, searchParams }: Pick<PageProps<"/[site]/book">, "params" | "searchParams">) {
  const { site: key } = await params;
  const parsed = stayQuery.safeParse(await searchParams);
  const [site, listings] = await Promise.all([getSite(key), getListings(key)]);
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
      <section className="rounded-3xl border border-line bg-white/80 p-6 sm:p-8">
        <h2 className="font-display text-xl">Who’s staying?</h2>
        <p className="mt-1 text-sm text-ink-soft">Your confirmation and check-in details will be sent here.</p>
        <div className="mt-6">
          <CheckoutForm listingId={listing.id} checkIn={checkIn} checkOut={checkOut} guests={guests} holdMinutes={site.payments.holdMinutes} />
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
    <div className="mt-8 rounded-3xl border border-line bg-white/80 p-8">
      <p>{message}</p>
      <Link href={href} className="mt-5 inline-flex rounded-full bg-brand px-6 py-3 font-medium text-white">
        Choose dates
      </Link>
    </div>
  );
}
