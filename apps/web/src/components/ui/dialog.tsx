"use client";

import { createContext, useContext, useEffect, useId, useMemo, useRef } from "react";
import { Icon } from "../icons";
import { iconButton } from "./button";

interface Props {
  open: boolean;
  onClose: () => void;
  /** "sm": a question or a short form. "lg": something to read through or fill in. */
  size?: keyof typeof SIZE;
  /** On phones: a sheet from the bottom, or the whole screen for long content. */
  phone?: keyof typeof PHONE;
  /** Always as tall as allowed, for a list that changes while open, so the popup doesn't jump. */
  steady?: boolean;
  /** DialogHeader, DialogBody and, for actions, DialogFooter. */
  children: React.ReactNode;
}

const SIZE = { sm: "sm:w-[30rem]", lg: "sm:w-[46rem]" } as const;

const PHONE = {
  sheet: "max-sm:mb-0 max-sm:rounded-b-none",
  full: "max-sm:m-0 max-sm:h-dvh max-sm:max-h-none max-sm:rounded-none",
} as const;

const DialogContext = createContext<{ titleId: string; close: () => void } | null>(null);

function useDialog() {
  const dialog = useContext(DialogContext);
  if (!dialog) throw new Error("Dialog parts must be inside a Dialog");
  return dialog;
}

/**
 * Every popup on the site: a native modal <dialog>, which traps focus, closes on Escape, makes the page
 * behind inert and returns focus to the control that opened it. Pressing outside closes it too. Its
 * content only exists while it is open. Mark a field `data-autofocus` to start there instead of at Close.
 *
 * They all look the same: a bar with the title on the left and Close on the right, a scrolling middle, and
 * a bar of actions with the main one on the right.
 */
export function Dialog({ open, onClose, size = "sm", phone = "sheet", steady = false, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const context = useMemo(() => ({ titleId, close: onClose }), [titleId, onClose]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      el.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  return (
    // Clipped rather than hidden: a hidden overflow can still be scrolled by moving focus, which would push
    // the whole panel out of view.
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`modal-in m-auto max-h-[min(52rem,calc(100dvh-3rem))] w-full max-w-none flex-col overflow-clip rounded-[28px] bg-white p-0 text-ink shadow-[0_24px_80px_-20px_rgba(0,0,0,0.5)] backdrop:bg-black/40 open:flex sm:max-w-[calc(100vw-2rem)] ${SIZE[size]} ${PHONE[phone]} ${steady ? "sm:h-[min(52rem,calc(100dvh-3rem))]" : ""}`}
    >
      <DialogContext value={context}>{open && children}</DialogContext>
    </dialog>
  );
}

/** The bar at the top: title (and a line under it) on the left, Close on the right. */
export function DialogHeader({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) {
  const { titleId, close } = useDialog();
  return (
    <div className="flex min-h-[4.25rem] shrink-0 items-center justify-between gap-4 border-b border-line py-3 pl-6 pr-4">
      <div className="min-w-0">
        <h2 id={titleId} className="text-lg font-medium leading-tight">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      <button type="button" onClick={close} aria-label="Close" className={iconButton}>
        <Icon name="close" className="h-5 w-5" />
      </button>
    </div>
  );
}

/** The scrolling middle. `relative`, so visually hidden inputs stay inside it. `text`: nothing in it takes focus, so it does, for scrolling by keyboard. */
export function DialogBody({ text = false, children }: { text?: boolean; children: React.ReactNode }) {
  return (
    <div tabIndex={text ? 0 : undefined} className="relative min-h-0 flex-1 overflow-y-auto px-6 py-6 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink">
      {children}
    </div>
  );
}

/** The bar of actions: the quiet one first (left), the main one last (right). */
export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex shrink-0 items-center justify-between gap-4 border-t border-line px-6 py-4 [&>:first-child]:-ml-1">{children}</div>;
}
