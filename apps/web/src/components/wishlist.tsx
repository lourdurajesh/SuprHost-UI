"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import type { ListingImage } from "@/lib/pms/types";
import { Icon } from "./icons";

// One shared copy of the guest's saved stay ids for every heart on the page, loaded after render
// (pages stay cacheable and identical for everyone). null = not loaded yet or signed out.
type State = { ids: Set<string> | null; signedIn: boolean | null };
let state: State = { ids: null, signedIn: null };
let loading = false;
const listeners = new Set<() => void>();
const emit = (next: State) => {
  state = next;
  listeners.forEach((l) => l());
};

function load() {
  if (loading || state.signedIn !== null) return;
  loading = true;
  fetch("/api/wishlist", { cache: "no-store" })
    .then(async (r) => (r.status === 401 ? emit({ ids: null, signedIn: false }) : r.ok ? emit({ ids: new Set((await r.json()).ids as string[]), signedIn: true }) : null))
    .catch(() => undefined)
    .finally(() => (loading = false));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Heart toggle for a stay. Signed-out guests are sent to sign in and brought back. */
export function WishlistButton({ listingId, name, className = "" }: { listingId: string; name: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSyncExternalStore(subscribe, () => state, () => state);
  const saved = current.ids?.has(listingId) ?? false;

  useEffect(load, []);

  async function toggle() {
    if (current.signedIn === false) {
      router.push(`/account/signin?next=${encodeURIComponent(pathname + window.location.search)}`);
      return;
    }
    const ids = new Set(current.ids ?? []);
    if (saved) ids.delete(listingId);
    else ids.add(listingId);
    emit({ ...current, ids }); // optimistic; rolled back below on failure
    const r = await fetch(`/api/wishlist/${listingId}`, { method: saved ? "DELETE" : "PUT" }).catch(() => null);
    if (r?.status === 401) {
      emit({ ids: null, signedIn: false });
      router.push(`/account/signin?next=${encodeURIComponent(pathname + window.location.search)}`);
    } else if (!r?.ok) emit(current);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved stays` : `Save ${name}`}
      className={`grid h-11 w-11 place-items-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 ${className}`}
    >
      <Icon name="heart" className={`h-5 w-5 ${saved ? "fill-brand text-brand" : "text-ink"}`} />
    </button>
  );
}

// ---- recently viewed: this browser only (localStorage), never sent anywhere ----------------

export interface RecentStay {
  slug: string;
  name: string;
  place: string;
  image: ListingImage | null;
  fromPrice: number;
}

const RECENT_KEY = "sh_recent";

function readRecent(): RecentStay[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? (v as RecentStay[]).filter((s) => typeof s?.slug === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

/** Remembers a viewed stay in this browser (newest first, eight at most). Renders nothing. */
export function TrackRecentView({ stay }: { stay: RecentStay }) {
  useEffect(() => {
    try {
      const rest = readRecent().filter((s) => s.slug !== stay.slug);
      localStorage.setItem(RECENT_KEY, JSON.stringify([stay, ...rest].slice(0, 8)));
    } catch {
      // Storage blocked (private mode): nothing to remember.
    }
  }, [stay]);
  return null;
}

let recentCache: { raw: string | null; list: RecentStay[] } = { raw: null, list: [] };
function recentSnapshot(): RecentStay[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(RECENT_KEY);
  } catch {
    return recentCache.list;
  }
  if (raw !== recentCache.raw) recentCache = { raw, list: readRecent() };
  return recentCache.list;
}
const noSubscribe = () => () => {};
const empty: RecentStay[] = [];

/** The stays this browser looked at recently, read after render so the page stays cacheable. */
export function useRecentStays(): RecentStay[] {
  return useSyncExternalStore(noSubscribe, recentSnapshot, () => empty);
}
