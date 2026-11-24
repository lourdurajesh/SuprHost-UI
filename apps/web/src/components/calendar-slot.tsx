"use client";

import { useCallback } from "react";
import { createStore } from "@/lib/store";

// The place in a stay page's text where the booking panel draws its calendar. The panel owns the dates
// and the availability; the calendar sits in the other column, so it is portalled. One slot per home,
// because Next keeps the previous page in the document.
const slots = createStore<Readonly<Record<string, HTMLElement>>>({});

export function CalendarSlot({ listingId }: { listingId: string }) {
  const ref = useCallback(
    (el: HTMLElement | null) => {
      const next = { ...slots.get() };
      if (el) next[listingId] = el;
      else delete next[listingId];
      slots.set(next);
    },
    [listingId],
  );
  return <div ref={ref} className="min-h-[22rem]" />;
}

export const useCalendarSlot = (listingId: string): HTMLElement | null => slots.use()[listingId] ?? null;
