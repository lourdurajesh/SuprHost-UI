import { useSyncExternalStore } from "react";
import { todayIn } from "./dates";

const never = () => () => {};

/**
 * Something only the browser knows (the address, a feature, the date). `fallback` is used on the server
 * and for the first paint, so prerendered pages never bake one visitor's value in. `read` must return a
 * primitive, or the same object each time.
 */
export function useBrowserValue<T>(read: () => T, fallback: T): T {
  return useSyncExternalStore(never, read, () => fallback);
}

/** Today in the site's timezone; null until the browser has it. */
export const useToday = (timezone: string) => useBrowserValue<string | null>(() => todayIn(timezone), null);

export function useMediaQuery(query: string, fallback: boolean): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

function everySecond(notify: () => void) {
  const id = setInterval(notify, 1000);
  return () => clearInterval(id);
}
const secondNow = () => Math.floor(Date.now() / 1000) * 1000;

/** A clock that ticks every second; null on the server, so a countdown never renders there. */
export const useNow = () => useSyncExternalStore(everySecond, secondNow, () => null);
