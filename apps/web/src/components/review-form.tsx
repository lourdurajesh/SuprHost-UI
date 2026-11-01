"use client";

import { useState } from "react";
import { Icon } from "./icons";

const LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

/** Star rating (a radio group, so it works with arrows and screen readers) and a short text. */
export function ReviewForm({ token, stayName }: { token: string; stayName: string }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) return setError("Choose a rating.");
    if (text.trim().length < 10) return setError("Write at least a sentence (10 characters).");
    setState("sending");
    setError(null);
    const r = await fetch(`/api/bookings/${encodeURIComponent(token)}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, text: text.trim() }),
    }).catch(() => null);
    if (r?.ok) return setState("done");
    const body = await r?.json().catch(() => null);
    setState("idle");
    setError(body?.message ?? "We couldn’t send your review. Please try again.");
  }

  if (state === "done") {
    return (
      <div role="status" className="rounded-2xl bg-sand-deep p-6">
        <p className="text-h3">Thank you!</p>
        <p className="mt-2 text-ink-soft">Your review of {stayName} has been sent. It appears on the site once the host has read it.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <fieldset>
        <legend className="text-sm font-medium">Your rating</legend>
        <div role="radiogroup" aria-label="Rating" className="mt-2 flex items-center gap-1">
          {LABELS.map((label, i) => {
            const value = i + 1;
            return (
              <label key={value} className="grid h-11 w-11 cursor-pointer place-items-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink">
                <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} className="sr-only" aria-label={`${value} – ${label}`} />
                <Icon name="star" className={`h-7 w-7 ${value <= rating ? "fill-brand text-brand" : "text-field"}`} />
              </label>
            );
          })}
          <span className="ml-2 text-sm text-ink-soft" aria-live="polite">{rating ? LABELS[rating - 1] : ""}</span>
        </div>
      </fieldset>

      <div>
        <label htmlFor="review-text" className="text-sm font-medium">What was your stay like?</label>
        <textarea
          id="review-text"
          rows={6}
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-describedby="review-help"
          className="mt-1.5 w-full rounded-lg border border-field bg-white px-4 py-3 text-base outline-none placeholder:text-ink-soft focus:border-brand focus:ring-4 focus:ring-brand/10"
          placeholder="The place, the hosts, anything future guests should know"
        />
        <p id="review-help" className="mt-1 text-sm text-ink-soft">Your first name and the month appear with your review. {2000 - text.length} characters left.</p>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <button type="submit" disabled={state === "sending"} className="min-h-12 rounded-full bg-brand px-8 font-medium text-white disabled:opacity-60">
        {state === "sending" ? "Sending…" : "Send review"}
      </button>
    </form>
  );
}
