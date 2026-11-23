import type { RatingSummary } from "@/lib/pms/types";
import { Icon } from "./icons";

/** An average from one or two reviews says little and reads as a pitch; show the count only. */
const MIN_REVIEWS_FOR_SCORE = 3;

/** "★ 4.8 (12)": the average of published reviews, with a screen-reader sentence. */
export function Rating({ rating, className = "" }: { rating?: RatingSummary | null; className?: string }) {
  if (!rating || rating.count === 0) return null;
  if (rating.count < MIN_REVIEWS_FOR_SCORE) {
    return (
      <span className={`inline-flex items-center gap-1 text-ink-soft ${className}`}>
        {rating.count} review{rating.count === 1 ? "" : "s"}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Icon name="star" className="h-4 w-4 fill-ink text-ink" />
      <span aria-hidden>
        {rating.average.toFixed(1)} <span className="text-ink-soft">({rating.count})</span>
      </span>
      <span className="sr-only">
        Rated {rating.average.toFixed(1)} out of 5 from {rating.count} review{rating.count === 1 ? "" : "s"}
      </span>
    </span>
  );
}
