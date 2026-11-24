"use client";

import { useCallback, useSyncExternalStore } from "react";

// The place in a stay page's text where the booking panel draws its calendar. The panel owns the dates
// and the availability; the calendar sits in the other column, so it is portalled (one slot per home:
// Next keeps the previous page in the document).
const slots = new Map<string, HTMLElement>();
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function CalendarSlot({ listingId }: { listingId: string }) {
  const ref = useCallback(
    (el: HTMLElement | null) => {
      if (el) slots.set(listingId, el);
      else slots.delete(listingId);
      listeners.forEach((l) => l());
    },
    [listingId],
  );
  return <div ref={ref} className="min-h-[22rem]" />;
}

export const useCalendarSlot = (listingId: string) =>
  useSyncExternalStore(
    subscribe,
    () => slots.get(listingId) ?? null,
    () => null,
  );
