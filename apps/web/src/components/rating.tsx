import type { RatingSummary } from "@/lib/pms/types";
import { formatScore, MIN_REVIEWS_FOR_SCORE } from "@/lib/reviews";
import { plural } from "@/lib/text";
import { Icon } from "./icons";

/** "★ 4.8 (12)": the average of published reviews, with a screen-reader sentence. */
export function Rating({ rating, className = "" }: { rating?: RatingSummary | null; className?: string }) {
  if (!rating || rating.count === 0) return null;
  if (rating.count < MIN_REVIEWS_FOR_SCORE) {
    return (
      <span className={`inline-flex items-center gap-1 text-ink-soft ${className}`}>
        {plural(rating.count, "review")}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Icon name="star" className="h-4 w-4 fill-ink text-ink" />
      <span aria-hidden>
        {formatScore(rating.average)} <span className="text-ink-soft">({rating.count})</span>
      </span>
      <span className="sr-only">
        Rated {formatScore(rating.average)} out of 5 from {plural(rating.count, "review")}
      </span>
    </span>
  );
}
