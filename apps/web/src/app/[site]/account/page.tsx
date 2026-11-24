import { maskMobile } from "@/lib/mobile";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { formatDate, formatMoney, todayIn } from "@/lib/dates";
import { getGuestSession, getSite, getTrips, getWishlist, type TripSummary } from "@/lib/pms";
import { ListingCard } from "@/themes/escape/listing-card";
import { readSessionToken } from "@/lib/session";
import { ListingPhoto } from "@/themes/escape/listing-media";

export const metadata: Metadata = { title: "My trips", robots: { index: false, follow: false } };

export default function AccountPage({ params }: PageProps<"/[site]/account">) {
  return (
    <div className="mx-auto max-w-[1064px] px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-3xl bg-sand-deep" />}>
        <Trips params={params} />
      </Suspense>
    </div>
  );
}

async function Trips({ params }: Pick<PageProps<"/[site]/account">, "params">) {
  const { site: key } = await params;
  const token = await readSessionToken();
  const session = token ? await getGuestSession(key, token) : null;
  if (!token || !session) redirect("/?signin=1&next=/account");
  const [site, trips, saved] = await Promise.all([getSite(key), getTrips(key, token), getWishlist(key, token).catch(() => [])]);
  if (!site) return null;

  const today = todayIn(site.timezone);
  const upcoming = trips.filter((t) => t.status === "confirmed" && t.checkOut >= today).reverse();
  const past = trips.filter((t) => !(t.status === "confirmed" && t.checkOut >= today));
  const whatsapp = site.contact.whatsapp?.replace(/\D/g, "");

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] leading-tight sm:text-[2rem]">My trips</h1>
          <p className="mt-2 text-ink-soft">Signed in as {session.signedInWith === "phone" ? maskMobile(session.phone ?? "") : session.email}</p>
        </div>
        {session.role === "host" && session.pmsUrl && (
          <a href={session.pmsUrl} className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-white hover:brightness-125">
            <Icon name="key" className="h-4 w-4" /> Open PMS
          </a>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-h2">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-sand-deep p-8">
            <p>No upcoming trips yet.</p>
            <Link href="/stays" className="mt-4 inline-flex rounded-xl bg-brand px-6 py-3 text-white">
              Find a stay
            </Link>
          </div>
        ) : (
          <ul className="mt-5 space-y-4">
            {upcoming.map((t) => (
              <TripRow key={t.reference} trip={t} whatsapp={whatsapp} />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-12">
          <h2 className="text-h2">Past and cancelled</h2>
          <ul className="mt-5 space-y-4">
            {past.map((t) => (
              <TripRow key={t.reference} trip={t} whatsapp={whatsapp} muted />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12" aria-labelledby="saved-heading">
        <h2 id="saved-heading" className="text-h2">Saved stays</h2>
        {saved.length === 0 ? (
          <p className="mt-3 text-ink-soft">Tap the heart on any stay to save it here.</p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
            {saved.map((l) => (
              <ListingCard key={l.id} listing={l} currency={site.currency} addsGst={site.pricesAddGst} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 rounded-2xl p-6 ring-1 ring-line sm:p-8">
        <h2 className="text-h2">Messages</h2>
        <p className="mt-2 text-ink-soft">
          Questions about a stay? Message us on WhatsApp with your booking reference.
        </p>
        {whatsapp && (
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 ring-1 ring-line hover:bg-sand-deep">
            <Icon name="chat" className="h-4 w-4" /> Chat on WhatsApp
          </a>
        )}
      </section>
    </>
  );
}

function TripRow({ trip, whatsapp, muted = false }: { trip: TripSummary; whatsapp?: string; muted?: boolean }) {
  return (
    // No opacity for past trips: faded text would drop below 4.5:1.
    <li className={`flex flex-col gap-5 rounded-2xl p-4 ring-1 sm:flex-row sm:items-center ${muted ? "ring-line bg-sand-deep/40" : "ring-line"}`}>
      <ListingPhoto image={trip.listing.image} name="" sizes="200px" className="aspect-[4/3] w-full shrink-0 rounded-xl sm:aspect-square sm:w-36" />
      <div className="flex-1">
        <p className="text-sm text-ink-soft">
          {trip.listing.propertyName} · <span className="font-mono">{trip.reference}</span>
          {trip.status === "cancelled" && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-800">Cancelled</span>}
        </p>
        <p className="mt-1 text-lg font-medium">{trip.listing.name}</p>
        <p className="mt-1 text-ink-soft">
          {formatDate(trip.checkIn, { weekday: "short", day: "numeric", month: "short" })} – {formatDate(trip.checkOut)} · {trip.guests} guest
          {trip.guests === 1 ? "" : "s"} · {formatMoney(trip.total, trip.currency)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 sm:flex-col">
        {trip.token && (
          <Link href={`/booking/${encodeURIComponent(trip.token)}`} className={`inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-center text-sm ${muted ? "ring-1 ring-line hover:bg-sand-deep" : "bg-brand text-white"}`}>
            View booking
          </Link>
        )}
        {trip.token && muted && trip.status === "confirmed" && (
          <Link href={`/review/${encodeURIComponent(trip.token)}`} className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-center text-sm ring-1 ring-ink hover:bg-sand-deep">
            Write a review
          </Link>
        )}
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello! About booking ${trip.reference}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-center text-sm ring-1 ring-line hover:bg-sand-deep"
          >
            Message host
          </a>
        )}
      </div>
    </li>
  );
}
