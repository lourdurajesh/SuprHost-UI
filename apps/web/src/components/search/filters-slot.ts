import { useSyncExternalStore } from "react";

// The place in the header, next to the search bar, where the results page puts its Filters button.
// The button needs the results (facets, prices) and the header doesn't have them, so it is portalled.
let slot: HTMLElement | null = null;
const listeners = new Set<() => void>();

export function setFiltersSlot(el: HTMLElement | null) {
  slot = el;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const useFiltersSlot = () =>
  useSyncExternalStore(
    subscribe,
    () => slot,
    () => null,
  );
