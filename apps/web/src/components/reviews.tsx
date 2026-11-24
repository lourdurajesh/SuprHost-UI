"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { RatingSummary } from "@/lib/pms/types";
import { formatScore, MIN_REVIEWS_FOR_SCORE } from "@/lib/reviews";
import { plural } from "@/lib/text";
import { Icon } from "./icons";
import { buttonClass } from "./ui/button";
import { Dialog, DialogClose } from "./ui/dialog";

// ssr: false gives it its own Suspense boundary; without one, the first opening blanks the whole page.
const ReviewsPanel = dynamic(() => import("./reviews-panel").then((m) => m.ReviewsPanel), { ssr: false });

/** "4.6 · 14 reviews" (or a "Show all" button) that opens every review of a home in a popup. */
export function ReviewsDialog({ slug, rating, brandName, trigger }: { slug: string; rating: RatingSummary; brandName: string; trigger: "link" | "button" }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const count = plural(rating.count, "review");
  return (
    <>
      {trigger === "link" ? (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-1.5 font-medium">
          {rating.count >= MIN_REVIEWS_FOR_SCORE && (
            <>
              <Icon name="star" className="h-4 w-4 fill-ink text-ink" />
              <span aria-hidden>{formatScore(rating.average)} ·</span>
              <span className="sr-only">Rated {formatScore(rating.average)} out of 5,</span>
            </>
          )}
          <span className="underline underline-offset-4">{count}</span>
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={`${buttonClass("soft")} max-sm:w-full`}>
          Show all {count}
        </button>
      )}

      <Dialog open={open} onClose={close} label="Guest reviews" layout="fixed" width="64.5rem" height="52rem" phone="full">
        <div className="flex shrink-0 border-b border-line px-4 py-3">
          <DialogClose onClose={close} />
        </div>
        <ReviewsPanel slug={slug} rating={rating} brandName={brandName} />
      </Dialog>
    </>
  );
}
