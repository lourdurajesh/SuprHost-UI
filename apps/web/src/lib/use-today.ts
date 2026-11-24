import { useSyncExternalStore } from "react";
import { todayIn } from "@/lib/dates";

const noSubscribe = () => () => {};

/** Today's date (yyyy-MM-dd) in the site's timezone; null on the server and during hydration. */
export function useToday(timezone: string): string | null {
  return useSyncExternalStore(noSubscribe, () => todayIn(timezone), () => null);
}
