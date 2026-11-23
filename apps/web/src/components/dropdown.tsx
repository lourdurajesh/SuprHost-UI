"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface DropdownOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Names the control for screen readers (the visible label is separate text). */
  "aria-label": string;
  /** Layout and look of the closed control (the same classes a native select would get). */
  className?: string;
}

const GAP = 6;
const EDGE = 8;
const MAX_HEIGHT = 288;

/**
 * A dropdown with a styled list (the browser's own list can't be styled). With a mouse or pen it is
 * a standard select-only combobox: arrow keys, Home/End, type-ahead, Enter or Space to choose,
 * Escape to close, and the list opens below the control or above it when there is no room. On touch
 * screens it renders a native <select> instead, so phones keep their own picker. The switch is pure
 * CSS (`pointer-fine`), so server and browser always render the same markup.
 */
export function Dropdown({ value, options, onChange, className = "", "aria-label": label }: Props) {
  const uid = useId();
  const listId = `${uid}-list`;
  const optionId = (i: number) => `${uid}-opt-${i}`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; minWidth: number; maxHeight: number; up: boolean } | null>(null);
  const [shift, setShift] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const selected = Math.max(0, options.findIndex((o) => o.value === value));

  const place = useCallback(() => {
    const el = button.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - EDGE - GAP;
    const above = r.top - EDGE - GAP;
    const up = below < 220 && above > below;
    const room = up ? above : below;
    setPos({
      left: Math.max(EDGE, Math.min(r.left, window.innerWidth - EDGE - r.width)),
      top: up ? r.top - GAP : r.bottom + GAP,
      minWidth: r.width,
      maxHeight: Math.min(MAX_HEIGHT, Math.max(120, room)),
      up,
    });
    setShift(0);
  }, []);

  function show() {
    // Touch screens use the native select; never open an invisible list.
    if (!window.matchMedia("(pointer: fine)").matches) return;
    place();
    setActive(selected);
    setOpen(true);
  }

  function hide(refocus = false) {
    setOpen(false);
    if (refocus) button.current?.focus();
  }

  function choose(i: number) {
    onChange(options[i].value);
    hide(true);
  }

  // A wide list is nudged left if it would run off the right edge of the screen.
  useLayoutEffect(() => {
    if (!open || !list.current) return;
    const r = list.current.getBoundingClientRect();
    const over = r.right - (window.innerWidth - EDGE);
    if (over > 0) setShift(-over);
  }, [open, pos]);

  // Keep the active option in view while moving with the keyboard.
  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  // Close on outside click, scroll or resize (the list is positioned from the control's place on screen).
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!button.current?.contains(t) && !list.current?.contains(t)) setOpen(false);
    };
    const close = (e: Event) => {
      if (e.type === "scroll" && list.current?.contains(e.target as Node)) return; // scrolling the list itself
      setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        hide(true);
        break;
      case "Tab":
        hide();
        break;
      default:
        // Type-ahead: letters or digits jump to the next option starting with them.
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const now = Date.now();
          typed.current.text = now - typed.current.at > 700 ? e.key : typed.current.text + e.key;
          typed.current.at = now;
          const needle = typed.current.text.toLowerCase();
          const from = typed.current.text.length === 1 ? active + 1 : active;
          const order = [...options.keys()].map((i) => (i + from) % options.length);
          const hit = order.find((i) => options[i].label.toLowerCase().startsWith(needle));
          if (hit !== undefined) setActive(hit);
        }
    }
  }

  // The closed control keeps the caller's classes, minus the "no outline" a native select used, so
  // keyboard focus shows the site's focus ring.
  const buttonClass = className.replace(/\boutline-none\b/g, "").replace(/\bselect-chevron\b/g, "");

  return (
    <>
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => (open ? hide() : show())}
        onKeyDown={onKeyDown}
        className={`hidden items-center justify-between gap-2 text-left pointer-fine:flex ${buttonClass}`}
      >
        <span className="min-w-0 truncate">{options[selected]?.label}</span>
        <svg aria-hidden viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 8 5 5 5-5" />
        </svg>
      </button>

      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`select-chevron pointer-fine:hidden ${className}`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {open &&
        pos &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            style={{
              position: "fixed",
              left: pos.left + shift,
              ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
              minWidth: pos.minWidth,
              maxHeight: pos.maxHeight,
              maxWidth: `calc(100vw - ${EDGE * 2}px)`,
            }}
            className="z-[70] w-max overflow-y-auto rounded-2xl bg-white p-1.5 text-ink shadow-[0_16px_40px_-12px_rgba(31,27,22,0.35)] ring-1 ring-line"
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={optionId(i)}
                role="option"
                aria-selected={i === selected}
                // Keep focus on the control while choosing.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex min-h-10 cursor-pointer items-center justify-between gap-6 rounded-xl px-3 py-2 text-[15px] ${i === active ? "bg-sand-deep" : ""} ${i === selected ? "font-medium" : ""}`}
              >
                <span>{o.label}</span>
                {i === selected && (
                  <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
