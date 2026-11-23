import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSite } from "@/lib/pms";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Policies" };

const PAYMENT_LABEL: Record<string, string> = { upi: "UPI", card: "credit or debit card", netbanking: "net banking" };

/** "UPI, card and net banking" */
const joinList = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} or ${items.at(-1)}`);

async function PoliciesPageContent({ params }: Pick<PageProps<"/[site]/policies">, "params">) {
  const site = await getSite((await params).site);
  if (!site) notFound();
  const { policies } = site;
  const money = site.currency;
  const methods = site.payments.methods.map((m) => PAYMENT_LABEL[m] ?? m);
  const live = site.payments.mode === "live";

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <h1 className="text-h1">Policies</h1>

      <section className="mt-10">
        <h2 className="text-h2">Check-in and check-out</h2>
        <p className="mt-3 text-ink-soft">
          Check-in from {policies.checkInTime}. Check-out by {policies.checkOutTime}. Early check-in or late check-out on
          request, subject to availability.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-h2">Cancellation</h2>
        <p className="mt-3 text-ink-soft">{policies.cancellation}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-h2">Payment</h2>
        <p className="mt-3 text-ink-soft">
          {live
            ? `You pay online by ${joinList(methods)}. Payments are encrypted; we never see or store your card details.`
            : "Online payment is not switched on yet. Your booking is confirmed and the host arranges payment with you."}{" "}
          Your dates are held for {site.payments.holdMinutes} minutes while you pay. Prices are in {money}.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-h2">Taxes</h2>
        <p className="mt-3 text-ink-soft">
          {site.pricesAddGst
            ? `Nightly prices are before GST. GST is added at checkout and shown as its own line; the rate depends on each night’s price.${site.gstin ? ` GSTIN ${site.gstin}.` : ""}`
            : "The host is not GST-registered, so no GST is added to your total."}{" "}
          Your total, with any cleaning fee, is shown before you book.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-h2">Changing or cancelling</h2>
        <p className="mt-3 text-ink-soft">
          Change your dates or cancel from My trips, signed in with the mobile number or email you booked with. When you cancel, the
          screen shows the charge and any refund before you confirm.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-h2">At check-in</h2>
        <p className="mt-3 text-ink-soft">Please bring a photo ID for each adult guest.</p>
      </section>

      <section className="mt-10">
        <h2 className="text-h2">House rules</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
          {policies.houseRules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      {(policies.notes ?? []).map((n) => (
        <section key={n.title} className="mt-10">
          <h2 className="text-h2">{n.title}</h2>
          <p className="mt-3 whitespace-pre-line text-ink-soft">{n.text}</p>
        </section>
      ))}

      <section className="mt-10">
        <h2 className="text-h2">Your information</h2>
        <p className="mt-3 text-ink-soft">
          We collect your name, email, phone number and stay details only to confirm your booking and manage
          your stay. We do not sell or share them for marketing.
        </p>
      </section>
    </div>
  );
}

// Reads the URL inside <Suspense> so the shell renders at once and client navigations stay instant.
export default function PoliciesPage({ params }: PageProps<"/[site]/policies">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-6 h-96 max-w-7xl animate-pulse rounded-3xl bg-sand-deep" aria-hidden />}>
      <PoliciesPageContent params={params} />
    </Suspense>
  );
}
