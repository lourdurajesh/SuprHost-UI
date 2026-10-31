"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { GuestSession } from "@/lib/pms/types";
import { Icon } from "./icons";

// Loads the session after the page renders, so every page stays cacheable and identical for all
// visitors. Hosts (staff of this tenant in the PMS) also get an "Open PMS" link.
export function AccountMenu() {
  const [session, setSession] = useState<GuestSession | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { session: GuestSession | null }) => alive && setSession(d.session))
      .catch(() => alive && setSession(null));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    // Menu-button pattern: focus moves into the menu when it opens.
    box.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => document.removeEventListener("click", close);
  }, [open]);

  function onMenuKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => {
      e.preventDefault();
      items[(n + items.length) % items.length]?.focus();
    };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    } else if (e.key === "Tab") setOpen(false);
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    // Full reload on purpose: drops every client-side cache that may hold the old session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }

  if (session === undefined) return <span className="inline-block h-11 w-11" aria-hidden />;

  if (!session) {
    return (
      <Link href="/account/signin" className="inline-flex min-h-11 items-center rounded-full px-3 hover:text-ink-soft">
        Sign in
      </Link>
    );
  }

  return (
    <div ref={box} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={session.role === "host" ? "Host account menu" : "Account menu"}
        className="flex min-h-11 min-w-11 items-center gap-2 rounded-full py-1.5 pl-2 pr-2 ring-1 ring-line hover:shadow-sm sm:pr-3"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs uppercase text-white">
          {(session.name ?? session.email).charAt(0)}
        </span>
        <span className="hidden text-sm sm:inline">{session.role === "host" ? "Host" : "Account"}</span>
      </button>
      {open && (
        <div role="menu" aria-label="Account" onKeyDown={onMenuKey} className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl bg-white py-2 text-base shadow-xl ring-1 ring-line">
          <p className="truncate px-4 pb-2 pt-1 text-xs text-ink-soft">{session.email}</p>
          <Link role="menuitem" href="/account" className="flex items-center gap-3 px-4 min-h-11 py-2.5 hover:bg-sand-deep focus-visible:bg-sand-deep">
            <Icon name="calendar" className="h-4 w-4" /> My trips
          </Link>
          {session.role === "host" && session.pmsUrl && (
            <a role="menuitem" href={session.pmsUrl} className="flex items-center gap-3 px-4 min-h-11 py-2.5 hover:bg-sand-deep focus-visible:bg-sand-deep">
              <Icon name="key" className="h-4 w-4" /> Open PMS
            </a>
          )}
          <button role="menuitem" type="button" onClick={signOut} className="flex w-full items-center gap-3 border-t border-line px-4 min-h-11 py-2.5 text-left hover:bg-sand-deep focus-visible:bg-sand-deep">
            <Icon name="arrowRight" className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
