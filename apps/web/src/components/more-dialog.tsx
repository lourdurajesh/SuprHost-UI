"use client";

import { useRef } from "react";
import { Icon } from "./icons";

/** "Show all …": a button that opens the full text or list in a dialog. */
export function MoreDialog({ label, title, variant = "button", children }: { label: string; title: string; variant?: "button" | "link"; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={
          variant === "link"
            ? "inline-flex min-h-11 items-center gap-1 font-medium underline underline-offset-4"
            : "inline-flex min-h-12 items-center rounded-xl bg-sand-deep px-6 font-medium transition hover:brightness-95 max-sm:w-full max-sm:justify-center"
        }
      >
        {label}
        {variant === "link" && <Icon name="chevronRight" className="h-4 w-4" />}
      </button>
      <dialog
        ref={dialog}
        aria-label={title}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="modal-in m-auto max-h-[min(50rem,calc(100dvh-3rem))] w-[min(46rem,calc(100vw-2rem))] max-w-none flex-col overflow-hidden rounded-[28px] bg-white p-0 text-ink shadow-[0_24px_80px_-20px_rgba(0,0,0,0.5)] backdrop:bg-black/40 open:flex max-sm:m-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:rounded-none"
      >
        <div className="flex shrink-0 items-center px-4 py-3">
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand-deep">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 sm:px-8">
          <h2 className="text-[1.625rem] leading-tight">{title}</h2>
          <div className="mt-6">{children}</div>
        </div>
      </dialog>
    </>
  );
}
