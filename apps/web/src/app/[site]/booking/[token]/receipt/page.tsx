import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PrintButton } from "@/components/print-button";
import { formatDate, formatMoney } from "@/lib/dates";
import { getBooking, getSite } from "@/lib/pms";
import { bookingToken } from "@/lib/validation";

export const metadata: Metadata = { title: "Booking receipt", robots: { index: false, follow: false } };

export default function ReceiptPage({ params }: PageProps<"/[site]/booking/[token]/receipt">) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12 print:max-w-none print:p-0">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-sand-deep" />}>
        <Receipt params={params} />
      </Suspense>
    </div>
  );
}

// A printable record of the booking. It is a receipt, not a GST tax invoice: that needs an invoice
// number series and SAC/place-of-supply details, which arrive with real payments (v0.3).
async function Receipt({ params }: Pick<PageProps<"/[site]/booking/[token]/receipt">, "params">) {
  await connection();
  const { site: key, token } = await params;
  const booking = bookingToken.safeParse(token).success ? await getBooking(key, token) : null;
  const site = await getSite(key);
  if (!booking || !site || booking.status === "pending_payment" || booking.status === "expired") {
    return <p className="rounded-2xl border border-line p-6">There’s no receipt for this booking yet.</p>;
  }

  const q = booking.quote;
  const money = (n: number) => formatMoney(n, q.currency);
  const day = (iso: string) => formatDate(iso, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const paid = booking.payment.paidAt ? formatDate(booking.payment.paidAt.slice(0, 10)) : null;

  return (
    <article className="rounded-2xl border border-line bg-white p-6 sm:p-10 print:border-0 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
        <div>
          <p className="text-h3">{site.brandName}</p>
          {site.contact.address && <p className="mt-1 max-w-xs text-sm text-ink-soft">{site.contact.address}</p>}
          {site.gstin && <p className="mt-1 text-sm text-ink-soft">GSTIN {site.gstin}</p>}
        </div>
        <div className="text-left sm:text-right">
          <h1 className="text-h2">Booking receipt</h1>
          <p className="mt-1 font-mono text-sm">{booking.reference}</p>
          {paid && <p className="text-sm text-ink-soft">Confirmed {paid}</p>}
        </div>
      </header>

      {booking.status === "cancelled" && (
        <p className="mt-6 rounded-lg bg-sand-deep px-4 py-3 text-sm">This booking was cancelled. The amounts below are what was booked.</p>
      )}

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-soft">Guest</dt>
          <dd className="mt-0.5 font-medium">{booking.guestName}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Stay</dt>
          <dd className="mt-0.5 font-medium">
            {booking.listing.name}
            {booking.listing.propertyName ? `, ${booking.listing.propertyName}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-ink-soft">Check-in</dt>
          <dd className="mt-0.5 font-medium">{day(booking.checkIn)}, from {site.policies.checkInTime}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Check-out</dt>
          <dd className="mt-0.5 font-medium">{day(booking.checkOut)}, by {site.policies.checkOutTime}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Guests</dt>
          <dd className="mt-0.5 font-medium">{booking.guests}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Payment</dt>
          <dd className="mt-0.5 font-medium">{booking.payment.mode === "simulated" ? "Arranged with the host (no online payment)" : "Paid online"}</dd>
        </div>
      </dl>

      <table className="mt-8 w-full text-sm">
        <caption className="sr-only">Price breakdown</caption>
        <tbody>
          {q.lines.map((l) => (
            <tr key={l.label} className="border-t border-line">
              <th scope="row" className="py-2.5 text-left font-normal text-ink-soft">{l.label}</th>
              <td className="py-2.5 text-right">{money(l.amount)}</td>
            </tr>
          ))}
          {(q.taxes ?? []).map((t) => (
            <tr key={t.label} className="border-t border-line">
              <th scope="row" className="py-2.5 text-left font-normal text-ink-soft">{t.label}</th>
              <td className="py-2.5 text-right">{money(t.amount)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-ink">
            <th scope="row" className="py-3 text-left text-base font-medium">Total</th>
            <td className="py-3 text-right text-base font-medium">{money(q.total)}</td>
          </tr>
        </tbody>
      </table>

      <p className="mt-6 text-xs text-ink-soft">{site.policies.cancellation}</p>

      <div className="mt-8 flex flex-wrap items-center gap-4 print:hidden">
        <PrintButton />
        <Link href={`/booking/${encodeURIComponent(token)}`} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
          Back to booking
        </Link>
      </div>
    </article>
  );
}
