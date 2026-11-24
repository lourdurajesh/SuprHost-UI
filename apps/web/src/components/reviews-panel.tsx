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

/** The reviews popup's content: score and spread on the left, every review with search and sorting on the right. */
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
  const count = plural(rating.count, "review");

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8 md:grid md:grid-cols-[18rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:gap-16 md:overflow-hidden md:pb-0">
      <div className="md:overflow-y-auto">
        {rating.count >= MIN_REVIEWS_FOR_SCORE ? (
          <p className="flex items-center gap-3 text-5xl font-medium tracking-tight">
            {formatScore(rating.average)} <Icon name="star" className="h-9 w-9 fill-ink text-ink" />
            <span className="sr-only">out of 5</span>
          </p>
        ) : (
          <p className="text-h2 font-medium">{count}</p>
        )}
        {reviews && reviews.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm">Overall rating</h3>
            <ul className="mt-2 space-y-1.5">
              {ratingSpread(reviews).map(({ stars, count: n }) => (
                <li key={stars} className="flex items-center gap-3 text-xs">
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
          </div>
        )}
      </div>

      <div className="max-md:mt-8 md:flex md:min-h-0 md:flex-col">
        {/* A little padding, so the controls' outlines aren't cut at the edge of the scrolling area. */}
        <div className="shrink-0 p-0.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h2">{count}</h2>
            <Dropdown aria-label="Sort reviews" value={sort} onChange={(v) => setSort(v as ReviewSort)} options={SORTS} className={pillClass} />
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-full px-4 ring-1 ring-field focus-within:ring-2 focus-within:ring-ink">
            <Icon name="search" className="h-4 w-4 shrink-0" />
            <input
              type="search"
              value={words}
              onChange={(e) => setWords(e.target.value)}
              placeholder="Search reviews"
              aria-label="Search reviews"
              className="focus-own min-h-11 w-full bg-transparent text-base outline-none"
            />
          </div>
        </div>
        <p role="status" className="sr-only">
          {reviews ? `${plural(shown.length, "review")} shown` : ""}
        </p>
        <div className="mt-6 relative md:min-h-0 md:flex-1 md:overflow-y-auto md:pb-8 md:pr-2">
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
            <ul className="space-y-10">
              {shown.map((r, i) => (
                <li key={`${r.author}-${r.month}-${i}`}>
                  <ReviewItem review={r} brandName={brandName} />
                </li>
              ))}
            </ul>
          )}
          {reviews && reviews.length < rating.count && <p className="mt-8 text-sm text-ink-soft">Showing the latest {reviews.length}.</p>}
        </div>
      </div>
    </div>
  );
}
