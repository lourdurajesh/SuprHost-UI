"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicReview, RatingSummary } from "@/lib/pms/types";
import { formatScore, MIN_REVIEWS_FOR_SCORE, ratingSpread, selectReviews, type ReviewSort } from "@/lib/reviews";
import { plural } from "@/lib/text";
import { Dropdown } from "./dropdown";
import { Icon } from "./icons";
import { ReviewItem } from "./review-item";
import { pillClass } from "./ui/button";

const SORTS: { value: ReviewSort; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "high", label: "Highest rated" },
  { value: "low", label: "Lowest rated" },
];

/** The reviews popup's content: score and spread, then every review with search and sorting. */
export function ReviewsPanel({ slug, rating, brandName }: { slug: string; rating: RatingSummary; brandName: string }) {
  const [reviews, setReviews] = useState<PublicReview[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sort, setSort] = useState<ReviewSort>("recent");
  const [words, setWords] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/reviews?listing=${encodeURIComponent(slug)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: { reviews: PublicReview[] }) => setReviews(d.reviews))
      .catch((e) => {
        if (e?.name !== "AbortError") setFailed(true);
      });
    return () => ctrl.abort();
  }, [slug]);

  const shown = useMemo(() => selectReviews(reviews ?? [], words, sort), [reviews, words, sort]);

  return (
    <>
      {/* Score and spread side by side in one short band, so the reviews get the width. */}
      <div className="flex items-center gap-6 sm:gap-10">
        <div className="shrink-0">
          {rating.count >= MIN_REVIEWS_FOR_SCORE && (
            <p className="flex items-center gap-2 text-4xl font-medium tracking-tight">
              {formatScore(rating.average)} <Icon name="star" className="h-7 w-7 fill-ink text-ink" />
              <span className="sr-only">out of 5</span>
            </p>
          )}
          <p className={rating.count >= MIN_REVIEWS_FOR_SCORE ? "mt-1 text-sm text-ink-soft" : "text-lg font-medium"}>{plural(rating.count, "review")}</p>
        </div>
        {reviews && reviews.length > 0 && (
          <ul aria-label="Overall rating" className="min-w-0 flex-1 space-y-1">
            {ratingSpread(reviews).map(({ stars, count: n }) => (
              <li key={stars} className="flex items-center gap-3 text-xs leading-none">
                <span aria-hidden className="w-2">
                  {stars}
                </span>
                <span aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                  <span className="block h-full rounded-full bg-ink" style={{ width: `${(n / reviews.length) * 100}%` }} />
                </span>
                <span className="sr-only">
                  {plural(stars, "star")}: {plural(n, "review")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Stays in reach while the reviews scroll under it. */}
      <div className="sticky -top-6 z-10 -mx-6 mt-3 flex gap-3 bg-white px-6 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full px-4 ring-1 ring-field focus-within:ring-2 focus-within:ring-ink">
          <Icon name="search" className="h-4 w-4 shrink-0" />
          <input
            type="search"
            value={words}
            onChange={(e) => setWords(e.target.value)}
            placeholder="Search reviews"
            aria-label="Search reviews"
            className="focus-own min-h-11 w-full min-w-0 bg-transparent text-base outline-none"
          />
        </div>
        <Dropdown aria-label="Sort reviews" value={sort} onChange={(v) => setSort(v as ReviewSort)} options={SORTS} className={pillClass} />
      </div>
      <p role="status" className="sr-only">
        {reviews ? `${plural(shown.length, "review")} shown` : ""}
      </p>

      <div role="region" aria-label="Reviews" className="mt-4">
        {failed ? (
          <p className="py-6 text-ink-soft">The reviews couldn’t be loaded just now. Please try again in a moment.</p>
        ) : !reviews ? (
          <div aria-hidden className="space-y-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-sand-deep" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="py-6 text-ink-soft">No reviews mention “{words.trim()}”.</p>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((r, i) => (
              <li key={`${r.author}-${r.month}-${i}`} className="py-6 first:pt-2 last:pb-0">
                <ReviewItem review={r} brandName={brandName} />
              </li>
            ))}
          </ul>
        )}
        {reviews && reviews.length < rating.count && <p className="mt-8 text-sm text-ink-soft">Showing the latest {reviews.length}.</p>}
      </div>
    </>
  );
}
