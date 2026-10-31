import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { formatDate, formatMoney, todayIn } from "@/lib/dates";
import { getGuestSession, getSite, getTrips, type TripSummary } from "@/lib/pms";
import { readSessionToken } from "@/lib/session";
import { ListingPhoto } from "@/themes/escape/listing-media";

export const metadata: Metadata = { title: "My trips", robots: { index: false, follow: false } };

export default function AccountPage({ params }: PageProps<"/[site]/account">) {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-10 sm:px-6">
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
  if (!token || !session) redirect("/account/signin");
  const [site, trips] = await Promise.all([getSite(key), getTrips(key, token)]);
  if (!site) return null;

  const today = todayIn(site.timezone);
  const upcoming = trips.filter((t) => t.status === "confirmed" && t.checkOut >= today).reverse();
  const past = trips.filter((t) => !(t.status === "confirmed" && t.checkOut >= today));
  const whatsapp = site.contact.whatsapp?.replace(/\D/g, "");

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl tracking-tight sm:text-5xl">My trips</h1>
          <p className="mt-2 text-ink-soft">Signed in as {session.email}</p>
        </div>
        {session.role === "host" && session.pmsUrl && (
          <a href={session.pmsUrl} className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-white hover:brightness-125">
            <Icon name="key" className="h-4 w-4" /> Open PMS
          </a>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-2xl tracking-tight">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="mt-5 rounded-3xl bg-sand-deep p-8">
            <p>No upcoming trips yet.</p>
            <Link href="/stays" className="mt-4 inline-flex rounded-full bg-brand px-6 py-3 text-white">
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
          <h2 className="text-2xl tracking-tight">Past and cancelled</h2>
          <ul className="mt-5 space-y-4">
            {past.map((t) => (
              <TripRow key={t.reference} trip={t} whatsapp={whatsapp} muted />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12 rounded-3xl p-6 ring-1 ring-line sm:p-8">
        <h2 className="text-xl tracking-tight">Messages</h2>
        <p className="mt-2 text-ink-soft">
          Questions about a stay? Message us on WhatsApp with your booking reference. Conversations on this site are coming soon.
        </p>
        {whatsapp && (
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 ring-1 ring-line hover:bg-sand-deep">
            <Icon name="chat" className="h-4 w-4" /> Chat on WhatsApp
          </a>
        )}
      </section>
    </>
  );
}

function TripRow({ trip, whatsapp, muted = false }: { trip: TripSummary; whatsapp?: string; muted?: boolean }) {
  return (
    <li className={`flex flex-col gap-5 rounded-3xl p-4 ring-1 ring-line sm:flex-row sm:items-center ${muted ? "opacity-75" : ""}`}>
      <ListingPhoto image={trip.listing.image} name="" sizes="200px" className="aspect-[4/3] w-full shrink-0 rounded-2xl sm:w-44" />
      <div className="flex-1">
        <p className="text-sm text-ink-soft">
          {trip.listing.propertyName} · <span className="font-mono">{trip.reference}</span>
          {trip.status === "cancelled" && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-800">Cancelled</span>}
        </p>
        <p className="mt-1 text-xl tracking-tight">{trip.listing.name}</p>
        <p className="mt-1 text-ink-soft">
          {formatDate(trip.checkIn, { weekday: "short", day: "numeric", month: "short" })} – {formatDate(trip.checkOut)} · {trip.guests} guest
          {trip.guests === 1 ? "" : "s"} · {formatMoney(trip.total, trip.currency)}
        </p>
      </div>
      <div className="flex gap-2 sm:flex-col">
        {trip.token && (
          <Link href={`/booking/${encodeURIComponent(trip.token)}`} className="rounded-full bg-brand px-5 py-2.5 text-center text-sm text-white">
            View booking
          </Link>
        )}
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello! About booking ${trip.reference}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-5 py-2.5 text-center text-sm ring-1 ring-line hover:bg-sand-deep"
          >
            Message host
          </a>
        )}
      </div>
    </li>
  );
}
