"use client";

import { useEffect, useRef } from "react";
import { Icon } from "../icons";
import { iconButton } from "./button";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Names the dialog. Use `labelledBy` instead when a heading inside does. */
  label?: string;
  labelledBy?: string;
  /**
   * "card": one scrolling block with padding. "panel": the caller lays out a bar, a scrolling middle and a
   * footer. "fixed": a panel that is always as tall as allowed, so a list inside can change without a jump.
   */
  layout?: keyof typeof LAYOUT;
  /** Widest it gets, as a CSS length. */
  width?: string;
  /** Tallest it gets on larger screens, as a CSS length (panels). */
  height?: string;
  /** On phones: a card in the middle, a sheet from the bottom, or the whole screen. */
  phone?: keyof typeof PHONE;
  children: React.ReactNode;
}

// Clipped rather than hidden: a hidden overflow can still be scrolled by moving focus, which would push the
// whole panel out of view. Scrolling areas inside are `relative`, so visually hidden inputs stay in them.
const LAYOUT = {
  card: "max-h-[calc(100dvh-2rem)] overflow-y-auto p-6",
  panel: "max-h-[min(var(--dialog-h),calc(100dvh-3rem))] flex-col overflow-clip p-0 open:flex",
  fixed: "h-[min(var(--dialog-h),calc(100dvh-3rem))] max-h-none flex-col overflow-clip p-0 open:flex",
} as const;

const PHONE = {
  card: "",
  sheet: "max-sm:mb-0 max-sm:w-full max-sm:rounded-b-none",
  full: "max-sm:m-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:rounded-none",
} as const;

/**
 * Every popup on the site: a native modal <dialog>, which traps focus, closes on Escape, makes the page
 * behind inert and returns focus to the control that opened it. Pressing outside closes it too. Its
 * content only exists while it is open. Mark a field `data-autofocus` to start there instead of at Close.
 */
export function Dialog({ open, onClose, label, labelledBy, layout = "card", width = "30rem", height = "50rem", phone = "card", children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

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
    <dialog
      ref={ref}
      aria-label={label}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      style={{ "--dialog-w": width, "--dialog-h": height } as React.CSSProperties}
      className={`modal-in m-auto w-[min(var(--dialog-w),calc(100vw-2rem))] max-w-none rounded-[28px] bg-white text-ink shadow-[0_24px_80px_-20px_rgba(0,0,0,0.5)] backdrop:bg-black/40 ${LAYOUT[layout]} ${PHONE[phone]}`}
    >
      {open && children}
    </dialog>
  );
}

export function DialogClose({ onClose, className = "" }: { onClose: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClose} aria-label="Close" className={`${iconButton} ${className}`}>
      <Icon name="close" className="h-5 w-5" />
    </button>
  );
}
