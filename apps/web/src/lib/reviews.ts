import type { PublicReview } from "./pms/types";

export type ReviewSort = "recent" | "high" | "low";

/** Reviews that mention the words, in the order asked for. The PMS sends the newest first; sorting keeps that among equals. */
export function selectReviews(reviews: PublicReview[], words: string, sort: ReviewSort): PublicReview[] {
  const needle = words.trim().toLowerCase();
  const found = needle ? reviews.filter((r) => `${r.text} ${r.author}`.toLowerCase().includes(needle)) : [...reviews];
  if (sort === "high") found.sort((a, b) => b.rating - a.rating);
  if (sort === "low") found.sort((a, b) => a.rating - b.rating);
  return found;
}

/** How many reviews gave 5, 4, 3, 2 and 1 stars. */
export const ratingSpread = (reviews: PublicReview[]) =>
  [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((r) => Math.round(r.rating) === stars).length }));

/** An average from one or two reviews says little and reads as a pitch; below this, show the count only. */
export const MIN_REVIEWS_FOR_SCORE = 3;

/** "4.6", "5.0". */
export const formatScore = (average: number) => average.toFixed(1);
