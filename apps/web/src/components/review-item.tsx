import type { PublicReview } from "@/lib/pms/types";
import { formatDate } from "@/lib/dates";

/** One guest review. `clamp`: the short form on a page, without the host's reply. */
export function ReviewItem({ review: r, brandName, clamp = false }: { review: PublicReview; brandName: string; clamp?: boolean }) {
  return (
    <>
      <div className="flex items-center gap-4">
        <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sand-deep font-medium">
          {r.author.charAt(0)}
        </span>
        <p className="font-medium">{r.author}</p>
      </div>
      <p className="mt-3 text-sm">
        <span aria-hidden className="tracking-widest">
          {"★".repeat(r.rating)}
          <span className="text-field">{"★".repeat(5 - r.rating)}</span>
        </span>
        <span className="sr-only">Rated {r.rating} out of 5</span>
        <span className="text-ink-soft"> · {formatDate(`${r.month}-01`, { month: "long", year: "numeric" })}</span>
      </p>
      <p className={`mt-2 whitespace-pre-line ${clamp ? "line-clamp-4" : ""}`}>{r.text}</p>
      {r.reply && !clamp && (
        <p className="mt-3 border-l-2 border-line pl-4 text-sm text-ink-soft">
          <span className="font-medium text-ink">Reply from {brandName}:</span> {r.reply}
        </p>
      )}
    </>
  );
}
