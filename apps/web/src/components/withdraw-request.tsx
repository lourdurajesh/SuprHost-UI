"use client";

import { useState } from "react";
import { bookingUrl } from "@/lib/links";
import { openSignIn } from "./sign-in";
import { buttonClass, textButton } from "./ui/button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "./ui/dialog";

/**
 * Takes back a request the host hasn't answered yet. Needs the guest signed in with the request's
 * email or mobile; a signed-out guest is sent to sign in and brought back here.
 */
export function WithdrawRequest({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/bookings/${encodeURIComponent(token)}/cancel`, { method: "POST" }).catch(() => null);
    if (r?.status === 401) return openSignIn(bookingUrl(token));
    setOpen(false);
    setBusy(false);
    // A full reload: the booking page is rendered on the server and a soft refresh can keep the old state.
    if (r?.ok) return window.location.reload();
    const body = await r?.json().catch(() => null);
    setError(body?.message ?? "We couldn’t withdraw your request. Please try again or contact us.");
  }

  return (
    <div className="mt-8">
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("outline", "sm")}>
        Withdraw request
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogHeader title="Withdraw this request?" />
        <DialogBody>
          <p>The host won’t see it any more and the dates are released at once. Nothing has been charged.</p>
        </DialogBody>
        <DialogFooter>
          <button type="button" onClick={() => setOpen(false)} data-autofocus className={textButton}>
            Keep request
          </button>
          <button type="button" onClick={withdraw} disabled={busy} className={buttonClass("danger")}>
            {busy ? "Withdrawing…" : "Yes, withdraw"}
          </button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
