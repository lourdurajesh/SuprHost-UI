import { createStore } from "@/lib/store";

// The place in the header, next to the search bar, where the results page puts its Filters button.
// The button needs the results (facets, prices) and the header doesn't have them, so it is portalled.
const slot = createStore<HTMLElement | null>(null);

export const setFiltersSlot = slot.set;
export const useFiltersSlot = slot.use;
