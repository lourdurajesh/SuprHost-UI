import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ReviewForm } from "@/components/review-form";
import { formatDate } from "@/lib/dates";
import { getReviewState } from "@/lib/pms";
import { bookingToken } from "@/lib/validation";

export const metadata: Metadata = { title: "Review your stay", robots: { index: false, follow: false } };

export default function ReviewPage({ params }: PageProps<"/[site]/review/[token]">) {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-10 sm:px-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-sand-deep" />}>
        <ReviewContent params={params} />
      </Suspense>
    </div>
  );
}

async function ReviewContent({ params }: Pick<PageProps<"/[site]/review/[token]">, "params">) {
  await connection();
  const { site: key, token } = await params;
  const state = bookingToken.safeParse(token).success ? await getReviewState(key, token) : null;
  if (!state) return <p className="rounded-2xl border border-line p-6">We couldn’t find this stay. Please use the link in your email.</p>;

  const dates = `${formatDate(state.checkIn, { day: "numeric", month: "short" })} – ${formatDate(state.checkOut)}`;
  return (
    <>
      <p className="text-eyebrow uppercase text-ink-soft">{dates}</p>
      <h1 className="mt-2 text-h1">How was {state.stayName}?</h1>
      {state.submitted ? (
        <p className="mt-6 rounded-2xl bg-sand-deep p-6">Thank you, {state.guestFirstName}, you’ve already reviewed this stay.</p>
      ) : !state.canReview ? (
        <p className="mt-6 rounded-2xl bg-sand-deep p-6">{state.reason ?? "This stay can’t be reviewed."}</p>
      ) : (
        <div className="mt-8">
          <ReviewForm token={token} stayName={state.stayName} />
        </div>
      )}
      <Link href="/account" className="mt-8 inline-flex min-h-11 items-center text-sm underline underline-offset-4">My trips</Link>
    </>
  );
}
