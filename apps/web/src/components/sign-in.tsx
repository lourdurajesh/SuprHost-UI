"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { safePath } from "@/lib/links";
import { createStore } from "@/lib/store";
import { Dialog, DialogClose } from "./ui/dialog";

const SignInForm = dynamic(() => import("./sign-in-form").then((m) => m.SignInForm), { loading: () => <div className="h-52" /> });

// Signing in is a popup over whatever the guest is doing, never a page. Anything can open it.
const request = createStore<{ next: string | null } | null>(null);

/** Opens the sign-in popup. Afterwards the guest stays where they are, or goes to `next` (a path on this site). */
export const openSignIn = (next: string | null = null) => request.set({ next: safePath(next) });

const signedIn = (next: string | null) => {
  // A full load, so the header and the page both pick up the new session.
  if (next && next !== window.location.pathname + window.location.search) window.location.assign(next);
  else window.location.reload();
};

/**
 * The popup itself, once per page (site layout). Pages that need a signed-in guest send others to
 * "/account?signin=1&next=…", which opens it here.
 */
export function SignInHost({ brandName, phoneSignIn }: { brandName: string; phoneSignIn: boolean }) {
  const params = useSearchParams();
  const asked = params.get("signin") === "1";
  const askedNext = params.get("next");
  const open = request.use();
  const close = () => request.set(null);

  useEffect(() => {
    if (!asked) return;
    openSignIn(askedNext);
    // The address goes back to the plain page, so a reload or a share doesn't open it again.
    const url = new URL(window.location.href);
    url.searchParams.delete("signin");
    url.searchParams.delete("next");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [asked, askedNext]);

  return (
    <Dialog open={open !== null} onClose={close} labelledBy="signin-title" phone="sheet">
      <DialogClose onClose={close} className="absolute right-4 top-4" />
      <div className="pt-9 text-center">
        <span aria-hidden className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand text-xl font-medium text-white">
          {brandName.charAt(0)}
        </span>
        <h2 id="signin-title" className="mt-4 text-[1.625rem] leading-tight">
          Log in or sign up
        </h2>
      </div>
      <div className="mt-8 pb-4">
        <SignInForm phoneSignIn={phoneSignIn} onSignedIn={() => signedIn(open?.next ?? null)} />
      </div>
    </Dialog>
  );
}
