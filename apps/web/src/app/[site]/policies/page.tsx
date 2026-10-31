import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSite } from "@/lib/pms";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Policies" };

async function PoliciesPageContent({ params }: Pick<PageProps<"/[site]/policies">, "params">) {
  const site = await getSite((await params).site);
  if (!site) notFound();
  const { policies } = site;

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
        <h2 className="text-h2">House rules</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
          {policies.houseRules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-h2">Your information</h2>
        <p className="mt-3 text-ink-soft">
          We collect your name, email, phone number and stay details only to respond to your booking request and manage
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
