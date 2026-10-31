import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSite } from "@/lib/pms";

export const metadata: Metadata = { title: "Policies" };

export default async function PoliciesPage({ params }: PageProps<"/[site]/policies">) {
  const site = await getSite((await params).site);
  if (!site) notFound();
  const { policies } = site;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <h1 className="font-display text-4xl tracking-tight">Policies</h1>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Check-in and check-out</h2>
        <p className="mt-3 text-ink-soft">
          Check-in from {policies.checkInTime}. Check-out by {policies.checkOutTime}. Early check-in or late check-out on
          request, subject to availability.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Cancellation</h2>
        <p className="mt-3 text-ink-soft">{policies.cancellation}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">House rules</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
          {policies.houseRules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Your information</h2>
        <p className="mt-3 text-ink-soft">
          We collect your name, email, phone number and stay details only to respond to your booking request and manage
          your stay. We do not sell or share them for marketing.
        </p>
      </section>
    </div>
  );
}
