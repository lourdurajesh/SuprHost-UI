"use client";

import { useMemo, useRef, useState } from "react";
import type { PublicReview, RatingSummary } from "@/lib/pms/types";
import { formatDate } from "@/lib/dates";
import { Icon } from "./icons";

interface Props {
  rating: RatingSummary;
  reviews: PublicReview[];
  brandName: string;
}

/** An average from one or two reviews says little and reads as a pitch; show the count only. */
const MIN_FOR_SCORE = 3;
const plural = (n: number) => `${n} review${n === 1 ? "" : "s"}`;

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <>
      <span aria-hidden className="tracking-widest">
        {"★".repeat(full)}
        <span className="text-field">{"★".repeat(5 - full)}</span>
      </span>
      <span className="sr-only">Rated {rating} out of 5</span>
    </>
  );
}

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
        <Stars rating={r.rating} />
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

/** The reviews in a popup: score and spread on the left, the reviews with search and sorting on the right. */
export function ReviewsDialog({ rating, reviews, brandName, trigger }: Props & { trigger: "link" | "button" }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const scored = rating.count >= MIN_FOR_SCORE;

  const show = () => {
    setOpen(true);
    dialog.current?.showModal();
  };
  return (
    <>
      {trigger === "link" ? (
        <button type="button" onClick={show} className="inline-flex min-h-11 items-center gap-1.5 font-medium">
          {scored && (
            <>
              <Icon name="star" className="h-4 w-4 fill-ink text-ink" />
              <span aria-hidden>{rating.average.toFixed(2).replace(/0$/, "")}</span>
              <span className="sr-only">Rated {rating.average.toFixed(1)} out of 5,</span>
              <span aria-hidden>·</span>
            </>
          )}
          <span className="underline underline-offset-4">{plural(rating.count)}</span>
        </button>
      ) : (
        <button type="button" onClick={show} className="inline-flex min-h-12 items-center rounded-xl bg-sand-deep px-6 font-medium transition hover:brightness-95 max-sm:w-full max-sm:justify-center">
          Show all {plural(rating.count)}
        </button>
      )}

      <dialog
        ref={dialog}
        aria-label="Guest reviews"
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="modal-in m-auto h-[min(52rem,calc(100dvh-3rem))] w-[min(64.5rem,calc(100vw-2rem))] max-w-none flex-col overflow-hidden rounded-[28px] bg-white p-0 text-ink shadow-[0_24px_80px_-20px_rgba(0,0,0,0.5)] backdrop:bg-black/40 open:flex max-sm:m-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:rounded-none"
      >
        <div className="flex shrink-0 px-4 py-3">
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand-deep">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        {open && <Content rating={rating} reviews={reviews} brandName={brandName} scored={scored} />}
      </dialog>
    </>
  );
}

type Sort = "recent" | "high" | "low";

function Content({ rating, reviews, brandName, scored }: Props & { scored: boolean }) {
  const [sort, setSort] = useState<Sort>("recent");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const words = q.trim().toLowerCase();
    const found = words ? reviews.filter((r) => `${r.text} ${r.author}`.toLowerCase().includes(words)) : [...reviews];
    // The PMS sends the newest first; sorting is stable, so equal ratings keep that order.
    if (sort === "high") found.sort((a, b) => b.rating - a.rating);
    if (sort === "low") found.sort((a, b) => a.rating - b.rating);
    return found;
  }, [q, sort, reviews]);
  const spread = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => Math.round(r.rating) === s).length }));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 sm:px-8 md:grid md:grid-cols-[18rem_1fr] md:gap-16 md:overflow-hidden">
      <div className="md:overflow-y-auto">
        {scored ? (
          <p className="flex items-center gap-3 text-5xl font-medium tracking-tight">
            {rating.average.toFixed(2).replace(/0$/, "")} <Icon name="star" className="h-9 w-9 fill-ink text-ink" />
            <span className="sr-only">out of 5</span>
          </p>
        ) : (
          <p className="text-h2 font-medium">{plural(rating.count)}</p>
        )}
        {reviews.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm">Overall rating</h3>
            <ul className="mt-2 space-y-1.5">
              {spread.map(({ s, n }) => (
                <li key={s} className="flex items-center gap-3 text-xs">
                  <span aria-hidden className="w-2">
                    {s}
                  </span>
                  <span aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full bg-ink" style={{ width: `${(n / reviews.length) * 100}%` }} />
                  </span>
                  <span className="sr-only">
                    {s} star{s === 1 ? "" : "s"}: {plural(n)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="max-md:mt-8 md:flex md:min-h-0 md:flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h2">{plural(rating.count)}</h2>
          <select
            aria-label="Sort reviews"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="select-chevron focus-own min-h-11 rounded-full bg-white pl-4 text-sm ring-1 ring-line [--select-inset:1rem] focus-visible:ring-2 focus-visible:ring-ink"
          >
            <option value="recent">Most recent</option>
            <option value="high">Highest rated</option>
            <option value="low">Lowest rated</option>
          </select>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-full px-4 ring-1 ring-field focus-within:ring-2 focus-within:ring-ink">
          <Icon name="search" className="h-4 w-4 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search reviews" aria-label="Search reviews" className="focus-own min-h-11 w-full bg-transparent text-base outline-none" />
        </div>
        <p role="status" className="sr-only">
          {plural(list.length)} shown
        </p>
        <div className="mt-6 md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-2">
          {list.length === 0 ? (
            <p className="py-6 text-ink-soft">No reviews mention “{q.trim()}”.</p>
          ) : (
            <ul className="space-y-10">
              {list.map((r, i) => (
                <li key={`${r.author}-${r.month}-${i}`}>
                  <ReviewItem review={r} brandName={brandName} />
                </li>
              ))}
            </ul>
          )}
          {reviews.length < rating.count && <p className="mt-8 text-sm text-ink-soft">Showing the latest {reviews.length}.</p>}
        </div>
      </div>
    </div>
  );
}
