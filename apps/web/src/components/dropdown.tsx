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
  /**
   * "attached" (default): the list joins the control as one rectangle, for controls that have their
   * own outline. "floating": a separate rounded card a few pixels off the control, for borderless
   * controls that sit inside something else (the hero search bar).
   */
  variant?: "attached" | "floating";
}

const EDGE = 8;
const MAX_HEIGHT = 288;
/** Corner radius shared by the open control and its list, so together they read as one rectangle. */
const RADIUS = 12;
/** Floating cards: distance from the control, corner radius, and the narrowest they get. */
const FLOAT_GAP = 8;
const FLOAT_RADIUS = 16;
const FLOAT_MIN_WIDTH = 176;

/**
 * A dropdown with a styled list (the browser's own list can't be styled). With a mouse or pen it is
 * a standard select-only combobox: arrow keys, Home/End, type-ahead, Enter or Space to choose,
 * Escape to close. The list is attached to the control, same width, no gap, one outline, so the two
 * look like a single rectangle; it opens below, or above when there is no room. By default the
 * control itself is the anchor; an ancestor marked `data-dropdown-anchor` (a bordered row the control
 * sits in) is used instead, and then that ancestor's own border is what the list continues. On touch
 * screens it renders a native <select> instead, so phones keep their own picker. The switch is pure
 * CSS (`pointer-fine`), so server and browser always render the same markup.
 */
export function Dropdown({ value, options, onChange, className = "", variant = "attached", "aria-label": label }: Props) {
  const floating = variant === "floating";
  const uid = useId();
  const listId = `${uid}-list`;
  const optionId = (i: number) => `${uid}-opt-${i}`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; maxHeight: number; up: boolean } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const anchorEl = useRef<HTMLElement | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const selected = Math.max(0, options.findIndex((o) => o.value === value));

  const place = useCallback(() => {
    const el = button.current;
    if (!el) return;
    const anchor = (el.closest("[data-dropdown-anchor]") as HTMLElement | null) ?? el;
    anchorEl.current = anchor;
    const r = anchor.getBoundingClientRect();
    const gap = floating ? FLOAT_GAP : 0;
    const below = window.innerHeight - r.bottom - EDGE - gap;
    const above = r.top - EDGE - gap;
    const up = below < 220 && above > below;
    // Attached: one pixel wider on each side so the list's border lines up with the control's outline.
    // Floating: at least a comfortable width, kept inside the screen.
    const width = floating ? Math.max(r.width, FLOAT_MIN_WIDTH) : r.width + 2;
    setPos({
      left: floating ? Math.max(EDGE, Math.min(r.left, window.innerWidth - EDGE - width)) : r.left - 1,
      top: up ? r.top - gap : r.bottom + gap,
      width,
      maxHeight: Math.min(MAX_HEIGHT, Math.max(120, up ? above : below)),
      up,
    });
  }, [floating]);

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

  // While open, a standalone control (a pill or a plain field) squares off the edge that touches the
  // list and gains the same outline, so control and list join. A row inside a bordered box
  // (data-dropdown-anchor) is left alone: the box's own border does the job.
  useLayoutEffect(() => {
    const el = anchorEl.current;
    if (floating || !open || !pos || !el || el !== button.current) return;
    const saved = el.style.cssText;
    const cs = getComputedStyle(el);
    const r = `${Math.min(parseFloat(cs.borderTopLeftRadius) || 0, RADIUS)}px`;
    const flat = "0px";
    el.style.borderTopLeftRadius = el.style.borderTopRightRadius = pos.up ? flat : r;
    el.style.borderBottomLeftRadius = el.style.borderBottomRightRadius = pos.up ? r : flat;
    el.style.boxShadow = "0 0 0 1px var(--line)";
    el.style.backgroundColor = "#fff";
    return () => {
      el.style.cssText = saved;
    };
  }, [open, pos, floating]);

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
      // The anchor counts as "inside": a click on the control's label then toggles instead of closing and reopening.
      if (!button.current?.contains(t) && !anchorEl.current?.contains(t) && !list.current?.contains(t)) setOpen(false);
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
  // A floating dropdown lives inside a larger cell that shows the focus ring itself (see the hero search).
  const buttonClass = (floating ? className : className.replace(/\boutline-none\b/g, "")).replace(/\bselect-chevron\b/g, "");

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
        // The site's global focus outline is unlayered, so it beats utility classes; a floating control
        // hands the focus ring to its cell and drops its own with an inline style.
        style={floating ? { outline: "none" } : undefined}
        className={`hidden items-center justify-between gap-2 text-left pointer-fine:flex ${buttonClass}`}
      >
        {/* The widest option is laid out invisibly under the shown one, so the control (and therefore the
            list attached to it) is always wide enough for every option and never changes width. */}
        <span className="grid min-w-0">
          <span className="col-start-1 row-start-1 truncate">{options[selected]?.label}</span>
          {options.map((o) => (
            <span key={o.value} aria-hidden className="invisible col-start-1 row-start-1 h-0 overflow-hidden whitespace-nowrap">
              {o.label}
            </span>
          ))}
        </span>
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
              left: pos.left,
              width: pos.width,
              ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
              maxHeight: pos.maxHeight,
              ...(floating
                ? {
                    // A free-standing card: even radius, and the shadow falls away from the control.
                    borderRadius: FLOAT_RADIUS,
                    boxShadow: `0 ${pos.up ? -16 : 16}px 36px -12px rgba(31,27,22,0.30), 0 2px 8px rgba(31,27,22,0.08)`,
                  }
                : {
                    // Radius only on the far corners; the near edge has no border and meets the control.
                    borderRadius: pos.up ? `${RADIUS}px ${RADIUS}px 0 0` : `0 0 ${RADIUS}px ${RADIUS}px`,
                    [pos.up ? "borderBottomWidth" : "borderTopWidth"]: 0,
                    filter: "drop-shadow(0 10px 14px rgba(31,27,22,0.14))",
                  }),
            }}
            className={`z-[70] overflow-y-auto border border-line bg-white text-ink [scrollbar-color:#cfc9c3_transparent] [scrollbar-width:thin] ${floating ? "p-1.5" : "p-1"}`}
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
                className={`flex min-h-10 cursor-pointer items-center justify-between gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-[15px] ${i === active ? "bg-sand-deep" : ""} ${i === selected ? "font-medium" : ""}`}
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
