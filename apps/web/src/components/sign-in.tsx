"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Icon } from "./icons";
import { SignInForm } from "./sign-in-form";

// Signing in is a popup over whatever the guest is doing, never a page. Anything can open it.
let request: { next: string | null } | null = null;
const listeners = new Set<() => void>();
function emit(v: typeof request) {
  request = v;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Opens the sign-in popup. Afterwards the guest stays where they are, or goes to `next`. */
export const openSignIn = (next: string | null = null) => emit({ next });

const safe = (p: string | null) => (p && p.startsWith("/") && !p.startsWith("//") ? p : null);

/**
 * The popup itself, once per page (site layout). Pages that need a signed-in guest send others to
 * "/?signin=1&next=…", which opens it here.
 */
export function SignInHost({ brandName, phoneSignIn }: { brandName: string; phoneSignIn: boolean }) {
  const params = useSearchParams();
  const asked = params.get("signin") === "1";
  const askedNext = params.get("next");
  const open = useSyncExternalStore(
    subscribe,
    () => request,
    () => null,
  );
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!asked) return;
    openSignIn(safe(askedNext));
    // The address goes back to the plain page, so a reload or a share doesn't open it again.
    const url = new URL(window.location.href);
    url.searchParams.delete("signin");
    url.searchParams.delete("next");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [asked, askedNext]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      // Straight to the field; by itself the dialog would focus its first button, Close.
      el.querySelector<HTMLInputElement>("label input")?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="signin-title"
      onClose={() => emit(null)}
      onClick={(e) => e.target === dialog.current && dialog.current.close()}
      className="modal-in m-auto max-h-[calc(100dvh-2rem)] w-[min(30rem,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-[32px] bg-white p-6 text-ink shadow-[0_24px_80px_-20px_rgba(0,0,0,0.5)] backdrop:bg-black/40 max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none"
    >
      <button
        type="button"
        onClick={() => dialog.current?.close()}
        aria-label="Close"
        className="focus-own absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full hover:bg-sand-deep focus-visible:ring-2 focus-visible:ring-ink"
      >
        <Icon name="close" className="h-5 w-5" />
      </button>
      <div className="pt-9 text-center">
        <span aria-hidden className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand text-xl font-medium text-white">
          {brandName.charAt(0)}
        </span>
        <h2 id="signin-title" className="mt-4 text-[1.625rem] leading-tight">
          Log in or sign up
        </h2>
      </div>
      <div className="mt-8 pb-4">
        {open && (
          <SignInForm
            phoneSignIn={phoneSignIn}
            onSignedIn={() => {
              // A full load, so the header and the page both pick up the new session.
              const here = window.location.pathname + window.location.search;
              if (open.next && open.next !== here) window.location.assign(open.next);
              else window.location.reload();
            }}
          />
        )}
      </div>
    </dialog>
  );
}
