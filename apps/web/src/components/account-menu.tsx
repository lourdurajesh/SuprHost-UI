"use client";

import { maskMobile } from "@/lib/mobile";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { GuestSession } from "@/lib/pms/types";
import { Icon } from "./icons";

// The one menu in the header: the account and the site's pages. Loads the session after the page
// renders, so every page stays cacheable and identical for all visitors. Hosts (staff of this tenant in the PMS) also get an "Open PMS" link.
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

  return (
    <div ref={box} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={session?.role === "host" ? "Menu, host account" : session ? "Menu, your account" : "Menu"}
        className="focus-own flex min-h-11 items-center gap-3 rounded-full bg-white py-1.5 pl-3.5 pr-2 ring-1 ring-line transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-ink"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs uppercase text-white">
          {session ? (session.name ?? session.email ?? "G").charAt(0) : <Icon name="users" className="h-4 w-4" />}
        </span>
      </button>
      {open && (
        <div role="menu" aria-label="Menu" onKeyDown={onMenuKey} className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-2xl bg-white py-2 text-base shadow-xl ring-1 ring-line">
          {session && <p className="truncate px-4 pb-2 pt-1 text-xs text-ink-soft">{session.signedInWith === "phone" ? maskMobile(session.phone ?? "") : session.email}</p>}
          {session ? (
            <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 min-h-11 py-2.5 hover:bg-sand-deep focus-visible:bg-sand-deep">
              <Icon name="calendar" className="h-4 w-4" /> My trips
            </Link>
          ) : (
            <Link role="menuitem" href="/account/signin" onClick={() => setOpen(false)} className="flex items-center px-4 min-h-11 py-2.5 font-medium hover:bg-sand-deep focus-visible:bg-sand-deep">
              Sign in
            </Link>
          )}
          {session?.role === "host" && session.pmsUrl && (
            <a role="menuitem" href={session.pmsUrl} className="flex items-center gap-3 px-4 min-h-11 py-2.5 hover:bg-sand-deep focus-visible:bg-sand-deep">
              <Icon name="key" className="h-4 w-4" /> Open PMS
            </a>
          )}
          <hr className="my-2 border-line" />
          <Link role="menuitem" href="/stays" onClick={() => setOpen(false)} className="flex items-center px-4 min-h-11 py-2.5 hover:bg-sand-deep focus-visible:bg-sand-deep">
            All stays
          </Link>
          <Link role="menuitem" href="/#about" onClick={() => setOpen(false)} className="flex items-center px-4 min-h-11 py-2.5 hover:bg-sand-deep focus-visible:bg-sand-deep">
            Our story
          </Link>
          <Link role="menuitem" href="/#faq" onClick={() => setOpen(false)} className="flex items-center px-4 min-h-11 py-2.5 hover:bg-sand-deep focus-visible:bg-sand-deep">
            FAQ
          </Link>
          <Link role="menuitem" href="/policies" onClick={() => setOpen(false)} className="flex items-center px-4 min-h-11 py-2.5 hover:bg-sand-deep focus-visible:bg-sand-deep">
            Policies
          </Link>
          <Link role="menuitem" href="/#contact" onClick={() => setOpen(false)} className="flex items-center px-4 min-h-11 py-2.5 hover:bg-sand-deep focus-visible:bg-sand-deep">
            Contact
          </Link>
          {session && (
            <button role="menuitem" type="button" onClick={signOut} className="mt-2 flex w-full items-center gap-3 border-t border-line px-4 min-h-11 py-2.5 text-left hover:bg-sand-deep focus-visible:bg-sand-deep">
              <Icon name="arrowRight" className="h-4 w-4" /> Sign out
            </button>
          )}
        </div>
      )}
    </div>
  );
}
