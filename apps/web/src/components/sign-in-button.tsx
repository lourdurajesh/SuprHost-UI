"use client";

import { openSignIn } from "./sign-in";
import { buttonClass } from "./ui/button";

/** Opens the sign-in popup over this page; afterwards the guest goes to `next`. */
export function SignInButton({ next, className = "" }: { next: string; className?: string }) {
  return (
    <button type="button" onClick={() => openSignIn(next)} className={`${buttonClass()} ${className}`}>
      Log in or sign up
    </button>
  );
}
