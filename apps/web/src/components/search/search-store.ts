import { createStore } from "@/lib/store";

export type Section = "where" | "when" | "who";
/** The two faces of the one search bar: in the site header, and on the home page's hero. */
export type SearchVariant = "compact" | "hero";

export interface SearchOpen {
  variant: SearchVariant;
  section: Section;
  /** Where the bar was on screen when it was pressed: the big bar grows out of it. */
  from: DOMRect;
  /** The control that was pressed, so focus can go back to it. */
  opener: HTMLElement;
}

// Which search bar is open, if any. A store rather than context, because the bars (page) and the
// panel (layout, so it survives the move to the results page) are in different trees.
const open = createStore<SearchOpen | null>(null);

export const setSearchOpen = open.set;
export const useSearchOpen = open.use;
