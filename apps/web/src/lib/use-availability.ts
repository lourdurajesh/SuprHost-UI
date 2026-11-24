import { useEffect, useState } from "react";
import type { Availability } from "./pms/types";
import { addDays } from "./dates";
import { useToday } from "./browser";

const DAYS_AHEAD = 400;

/**
 * A home's busy nights and seasonal minimum stays, for a calendar. Loads once `enabled`. A failure leaves
 * a blank calendar: the dates are checked again when the price is worked out.
 */
export function useAvailability(listingId: string, timezone: string, enabled = true) {
  const today = useToday(timezone);
  const [loaded, setLoaded] = useState<{ id: string; data: Availability } | null>(null);
  const data = loaded?.id === listingId ? loaded.data : null;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || !today || data) return;
    const ctrl = new AbortController();
    fetch(`/api/availability?listing=${listingId}&from=${today}&to=${addDays(today, DAYS_AHEAD)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((a: Availability) => {
        setLoaded({ id: listingId, data: a });
        setFailed(false);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setFailed(true);
      });
    return () => ctrl.abort();
  }, [enabled, today, data, listingId]);

  return { busy: data?.busy ?? NONE, rules: data?.rules ?? NO_RULES, today, failed, reload: () => setLoaded(null) };
}

// The same empty lists every time, so nothing re-renders for a new array.
const NONE: Availability["busy"] = [];
const NO_RULES: NonNullable<Availability["rules"]> = [];
