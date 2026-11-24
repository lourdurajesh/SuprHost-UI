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

  const sections: { title: string; body: React.ReactNode }[] = [
    {
      title: "Check-in and check-out",
      body: (
        <p className="text-ink-soft">
          Check-in from {policies.checkInTime}. Check-out by {policies.checkOutTime}. Early check-in or late check-out on
          request, subject to availability.
        </p>
      ),
    },
    {
      title: "Cancellation",
      body: (
        <p className="text-ink-soft">{policies.cancellation}</p>
      ),
    },
    {
      title: "Payment",
      body: (
        <p className="text-ink-soft">
          {live
            ? `You pay online by ${joinList(methods)}. Payments are encrypted; we never see or store your card details.`
            : "Online payment is not switched on yet. Your booking is confirmed and the host arranges payment with you."}{" "}
          Your dates are held for {site.payments.holdMinutes} minutes while you pay. Prices are in {money}.
        </p>
      ),
    },
    {
      title: "Taxes",
      body: (
        <p className="text-ink-soft">
          {site.pricesAddGst
            ? `Nightly prices are before GST. GST is added at checkout and shown as its own line; the rate depends on each night’s price.${site.gstin ? ` GSTIN ${site.gstin}.` : ""}`
            : "The host is not GST-registered, so no GST is added to your total."}{" "}
          Your total, with any cleaning fee, is shown before you book.
        </p>
      ),
    },
    {
      title: "Changing or cancelling",
      body: (
        <p className="text-ink-soft">
          Change your dates or cancel from My trips, signed in with the mobile number or email you booked with. When you cancel, the
          screen shows the charge and any refund before you confirm.
        </p>
      ),
    },
    {
      title: "At check-in",
      body: (
        <p className="text-ink-soft">Please bring a photo ID for each adult guest.</p>
      ),
    },
    {
      title: "House rules",
      body: (
        <ul className="list-disc space-y-1 pl-5 text-ink-soft">
          {policies.houseRules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ),
    },
    ...(policies.notes ?? []).map((n) => ({ title: n.title, body: <p className="whitespace-pre-line text-ink-soft">{n.text}</p> })),
    {
      title: "Your information",
      body: (
        <p className="text-ink-soft">
          We collect your name, email, phone number and stay details only to confirm your booking and manage
          your stay. We do not sell or share them for marketing.
        </p>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
      <h1 className="text-h1">Policies</h1>
      <div className="mt-10 gap-16 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="max-lg:mb-10 lg:sticky lg:top-28 lg:self-start">
          <ul className="flex flex-wrap gap-x-5 lg:flex-col">
            {sections.map((s, i) => (
              <li key={s.title}>
                <a href={`#policy-${i + 1}`} className="inline-flex min-h-11 items-center text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="divide-y divide-line border-y border-line">
          {sections.map((s, i) => (
            <section key={s.title} id={`policy-${i + 1}`} aria-labelledby={`policy-${i + 1}-title`} className="py-8">
              <h2 id={`policy-${i + 1}-title`} className="text-h2">
                {s.title}
              </h2>
              <div className="mt-3">{s.body}</div>
            </section>
          ))}
        </div>
      </div>
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
