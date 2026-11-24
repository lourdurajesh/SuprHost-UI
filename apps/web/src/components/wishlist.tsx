"use client";

import { useEffect } from "react";
import { useBrowserValue } from "@/lib/browser";
import type { ListingImage } from "@/lib/pms/types";
import { createStore } from "@/lib/store";
import { Icon } from "./icons";
import { openSignIn } from "./sign-in";

// One shared copy of the guest's saved stay ids for every heart on the page, loaded after render
// (pages stay cacheable and identical for everyone). null = not loaded yet or signed out.
type State = { ids: Set<string> | null; signedIn: boolean | null };
const saved = createStore<State>({ ids: null, signedIn: null });
let loading = false;

function load() {
  if (loading || saved.get().signedIn !== null) return;
  loading = true;
  fetch("/api/wishlist", { cache: "no-store" })
    .then(async (r) => {
      if (r.status === 401) return saved.set({ ids: null, signedIn: false });
      if (!r.ok) return;
      const body = (await r.json()) as { signedIn?: boolean; ids: string[] };
      saved.set(body.signedIn === false ? { ids: null, signedIn: false } : { ids: new Set(body.ids), signedIn: true });
    })
    .catch(() => undefined)
    .finally(() => (loading = false));
}

/** Heart toggle for a stay. Signed-out guests get the sign-in popup. "text": icon and word. */
export function WishlistButton({ listingId, name, variant = "icon", className = "" }: { listingId: string; name: string; variant?: "icon" | "text"; className?: string }) {
  const current = saved.use();
  const isSaved = current.ids?.has(listingId) ?? false;

  useEffect(load, []);

  async function toggle() {
    if (current.signedIn === false) {
      openSignIn();
      return;
    }
    const ids = new Set(current.ids ?? []);
    if (isSaved) ids.delete(listingId);
    else ids.add(listingId);
    saved.set({ ...current, ids }); // optimistic; rolled back below on failure
    const r = await fetch(`/api/wishlist/${listingId}`, { method: isSaved ? "DELETE" : "PUT" }).catch(() => null);
    if (r?.status === 401) {
      saved.set({ ids: null, signedIn: false });
      openSignIn();
    } else if (!r?.ok) saved.set(current);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove ${name} from saved stays` : `Save ${name}`}
      className={`${
        variant === "icon"
          ? "grid h-11 w-11 place-items-center rounded-full bg-white/95 shadow-sm transition hover:scale-105"
          : "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-sand-deep"
      } ${className}`}
    >
      <Icon name="heart" className={`${variant === "icon" ? "h-5 w-5" : "h-4 w-4"} ${isSaved ? "fill-brand text-brand" : "text-ink"}`} />
      {variant === "text" && <span className="underline underline-offset-2">{isSaved ? "Saved" : "Save"}</span>}
    </button>
  );
}

// ---- recently viewed: this browser only (localStorage), never sent anywhere ----------------

interface RecentStay {
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
const empty: RecentStay[] = [];

/** The stays this browser looked at recently, read after render so the page stays cacheable. */
export function useRecentStays(): RecentStay[] {
  return useBrowserValue(recentSnapshot, empty);
}
