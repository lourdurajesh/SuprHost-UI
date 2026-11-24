"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SearchQuery } from "@/lib/pms/types";
import { describeWhen } from "@/lib/search-query";
import { Icon } from "../icons";
import { applyDraft, draftFrom, EMPTY_DRAFT, type Draft } from "./draft";
import { SearchFace } from "./search-bar";
import type { SearchOpen, SearchVariant, Section } from "./search-store";
import { WhenPanel } from "./when-panel";
import { WherePanel, type Place } from "./where-panel";
import { WhoPanel } from "./who-panel";

/** How long the bar takes to travel, and to settle on its final place in the header. */
const MOVE_MS = 420;
const SETTLE_MS = 260;
const HEADER = 76;
const BAR_H = 66;

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia("(min-width: 640px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useWide = () => useSyncExternalStore(subscribe, () => window.matchMedia("(min-width: 640px)").matches, () => true);

const onResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const useViewport = () => {
  const v = useSyncExternalStore(onResize, () => `${document.documentElement.clientWidth}x${window.innerHeight}`, () => "1280x800");
  const [w, h] = v.split("x").map(Number);
  return { w, h };
};

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * enter: the bar is still where it was pressed. open: in its place, being edited. out: going back.
 * go: "Search" was pressed, the bar travels to the header while the results load. settle: results are
 * in, the bar takes the exact place of the header's own bar and hands over to it.
 */
type Phase = "enter" | "open" | "out" | "go" | "settle";

/** Where the header's bar is, or will be once the results page (with its Filters button) is there. */
function headerBar(wide: boolean): Rect {
  const el = document.querySelector<HTMLElement>(`[data-search-bar="${wide ? "compact" : "compact-phone"}"]`);
  const box = el?.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  if (!box || box.width === 0) return wide ? { left: vw / 2 - 180, top: HEADER / 2 - 25, width: 360, height: 50 } : { left: 16, top: HEADER, width: vw - 32, height: 52 };
  if (!wide) return box;
  const onResults = window.location.pathname === "/stays";
  const shift = onResults ? 0 : ((vw >= 1024 ? 96 : 48) + 12) / 2;
  return { left: box.left - shift, top: HEADER / 2 - box.height / 2, width: box.width, height: box.height };
}

interface Props {
  open: SearchOpen;
  query: SearchQuery;
  places: Place[];
  timezone: string;
  brandName: string;
  /** The results page is loading. */
  pending: boolean;
  onApply: (next: SearchQuery) => void;
  onClose: (searched: boolean) => void;
}

/**
 * The search panel. On larger screens the pressed bar grows into a big Where | When | Who bar: under the
 * header when it came from there, in the middle of a dimmed, blurred page when it came from the home
 * page's hero. A white thumb slides to the segment being edited and its panel opens below. On phones it
 * is a full-screen sheet of three cards that opens out of the bar. Nothing reaches the URL until "Search";
 * then the bar travels up into the header while the results load.
 */
export function SearchOverlay({ open, query, places, timezone, brandName, pending, onApply, onClose }: Props) {
  const wide = useWide();
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<Section>(open.section);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(query));
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("enter");
  const [target, setTarget] = useState<Rect | null>(null);
  const startedAt = useRef(0);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const close = useCallback(() => setPhase((p) => (p === "open" || p === "enter" ? "out" : p)), []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (!el.open) el.showModal();
    // Lay the bar out where it was pressed first, so there is something to travel from. A timer rather
    // than an animation frame: a window in the background draws none, and the panel must still open.
    el.getBoundingClientRect();
    const id = setTimeout(() => setPhase((p) => (p === "enter" ? "open" : p)), 24);
    const html = document.documentElement;
    const body = document.body;
    const before = { overflow: html.style.overflow, padding: body.style.paddingRight };
    // Keep the scrollbar's width while the page is locked, so nothing behind shifts sideways.
    // (Padding rather than scrollbar-gutter: the blur has to reach the edge of the screen.)
    const bar = window.innerWidth - html.clientWidth;
    if (bar > 0) body.style.paddingRight = `${bar}px`;
    html.style.overflow = "hidden";
    return () => {
      clearTimeout(id);
      html.style.overflow = before.overflow;
      body.style.paddingRight = before.padding;
    };
  }, []);

  // Leaving: back to where the bar came from, or on to the header once the results are in.
  useEffect(() => {
    if (phase === "out") {
      const t = setTimeout(() => onClose(false), MOVE_MS);
      return () => clearTimeout(t);
    }
    if (phase === "go" && !pending) {
      const t = setTimeout(
        () => {
          setTarget(headerBar(wide));
          setPhase("settle");
        },
        Math.max(0, (wide ? MOVE_MS : 0) - (Date.now() - startedAt.current)),
      );
      return () => clearTimeout(t);
    }
    if (phase === "settle") {
      const t = setTimeout(() => onClose(true), wide ? SETTLE_MS : MOVE_MS);
      return () => clearTimeout(t);
    }
    // onClose changes every render of the host; restarting the timer for that would never finish it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pending, wide]);

  function search() {
    if (phase !== "open" && phase !== "enter") return;
    startedAt.current = Date.now();
    setTarget(headerBar(wide));
    setPhase("go");
    onApply(applyDraft(draft, query));
  }

  const guests = draft.adults + draft.children;
  const shared = {
    open,
    phase,
    target,
    active,
    setActive,
    close,
    search,
    draft,
    patch,
    typed,
    setTyped,
    pending,
    next: applyDraft(draft, query),
    whereValue: draft.city ?? "",
    whenText: describeWhen(applyDraft(draft, {}), true),
    whoText: guests ? `${guests} guest${guests === 1 ? "" : "s"}` : "Add guests",
    panels: {
      where: (
        <WherePanel
          places={places}
          typed={typed}
          selected={draft.city}
          onPick={(city) => {
            patch({ city });
            setTyped("");
            setActive("when");
          }}
        />
      ),
      when: <WhenPanel draft={draft} timezone={timezone} onChange={(p) => patch(p)} onDatesComplete={() => setActive("who")} />,
      who: <WhoPanel adults={draft.adults} kids={draft.children} onChange={(adults, children) => patch({ adults, children })} />,
    },
  };

  return (
    <dialog
      ref={dialog}
      aria-label="Search stays"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-transparent p-0 text-ink backdrop:bg-transparent"
    >
      {wide ? (
        <Desktop {...shared} brandName={brandName} />
      ) : (
        <Mobile
          {...shared}
          clear={() => {
            setDraft(EMPTY_DRAFT);
            setTyped("");
          }}
        />
      )}
    </dialog>
  );
}

interface LayoutProps {
  open: SearchOpen;
  phase: Phase;
  target: Rect | null;
  active: Section;
  setActive: (s: Section) => void;
  close: () => void;
  search: () => void;
  draft: Draft;
  patch: (p: Partial<Draft>) => void;
  typed: string;
  setTyped: (v: string) => void;
  pending: boolean;
  /** The search as it would be applied now, for the bar's resting face. */
  next: SearchQuery;
  whereValue: string;
  whenText: string;
  whoText: string;
  panels: Record<Section, React.ReactNode>;
}

const hasValue = (d: Draft, s: Section) =>
  s === "where" ? Boolean(d.city) : s === "when" ? Boolean(d.checkIn || d.stay || d.months.length) : d.adults + d.children > 0;

const EASE = "cubic-bezier(0.22, 0.8, 0.2, 1)";

function Desktop({ open, phase, target, active, setActive, close, search, draft, patch, typed, setTyped, pending, next, whereValue, whenText, whoText, panels, brandName }: LayoutProps & { brandName: string }) {
  const view = useViewport();
  const layer = useRef<HTMLDivElement>(null);
  const whereRef = useRef<HTMLDivElement>(null);
  const whenRef = useRef<HTMLDivElement>(null);
  const whoRef = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [geo, setGeo] = useState<Record<Section, { left: number; width: number }> | null>(null);

  const hero = open.variant === "hero";
  const isOpen = phase === "open";
  const leaving = phase === "go" || phase === "settle";

  // The big bar's place. From the hero, the bar and the panel under it sit in the middle of the screen.
  const width = Math.min(864, view.w - 32);
  const place: Rect = {
    left: (view.w - width) / 2,
    top: hero ? Math.max(HEADER + 8, (view.h - BAR_H - 12 - 480) / 2) : HEADER,
    width,
    height: BAR_H,
  };
  const at: Rect = isOpen ? place : leaving && target ? target : open.from;
  // At rest the moving bar wears the face of the bar it stands in for.
  const face: SearchVariant = leaving ? "compact" : open.variant;

  // Where the white thumb goes: measured from the real segments. Their layer keeps the big bar's width
  // while the bar itself moves and resizes, so the measure never depends on the animation.
  useLayoutEffect(() => {
    const r = (el: HTMLDivElement | null) => ({ left: el!.offsetLeft, width: el!.offsetWidth });
    setGeo({ where: r(whereRef.current), when: r(whenRef.current), who: r(whoRef.current) });
  }, [width]);

  // Focus follows the segment being edited, so the keyboard and screen readers move on with the panel.
  // Waits for the dialog to be open: nothing inside a closed one can take focus.
  useEffect(() => {
    if (!isOpen) return;
    const el = active === "where" ? input.current : (active === "when" ? whenRef : whoRef).current?.querySelector("button");
    el?.focus({ preventScroll: true });
  }, [active, isOpen]);

  const thumb = geo?.[active];
  const panelBox = !geo
    ? { left: 0, width: 0 }
    : active === "where"
      ? { left: 0, width: Math.min(432, width) }
      : active === "when"
        ? { left: 0, width }
        : { left: Math.max(0, width - 400), width: Math.min(400, width) };

  const seg = "relative z-10 flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-center rounded-full px-7 text-left outline-none focus-own focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink";

  return (
    <>
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${hero ? "bg-black/40 backdrop-blur-md" : "bg-black/35"} ${isOpen || phase === "go" ? "opacity-100" : "opacity-0"}`}
        onClick={close}
        aria-hidden
      />

      {hero ? (
        // On its way to the results: the white header it is travelling to.
        <div aria-hidden className={`absolute inset-x-0 top-0 h-[76px] bg-white transition-opacity duration-300 ${phase === "go" ? "opacity-100" : "opacity-0"}`} />
      ) : (
        // The header coming down: its white ground unrolls while the bar grows out of the compact one.
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 origin-top bg-white shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
          style={{ height: HEADER + BAR_H + 28, transform: isOpen ? "none" : `scaleY(${HEADER / (HEADER + BAR_H + 28)})`, opacity: phase === "enter" || phase === "settle" || phase === "out" ? 0 : 1, transition: `transform ${MOVE_MS}ms ${EASE}, opacity 220ms ease-out` }}
        />
      )}

      <div className={`absolute inset-x-0 top-0 transition-opacity duration-200 ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className={`truncate text-xl tracking-tight sm:text-2xl ${hero ? "invisible" : ""}`}>{brandName}</span>
          <button type="button" onClick={close} aria-label="Close search" className="focus-own grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-line hover:ring-ink focus-visible:ring-2 focus-visible:ring-ink">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* The bar itself: one element that travels between its places. */}
      <div
        className="absolute z-20 overflow-hidden rounded-full ring-1 ring-line"
        style={{
          left: at.left,
          top: at.top,
          width: at.width,
          height: at.height,
          backgroundColor: isOpen ? "var(--sand-deep)" : "#fff",
          boxShadow: isOpen && hero ? "0 24px 70px -20px rgba(0,0,0,0.55)" : "0 2px 10px rgba(0,0,0,0.08)",
          transition: ["left", "top", "width", "height"].map((p) => `${p} ${phase === "settle" ? SETTLE_MS : MOVE_MS}ms ${EASE}`).join(", ") + ", background-color 250ms ease-out, box-shadow 300ms ease-out",
        }}
      >
        {/* At rest. */}
        <div aria-hidden inert className={`absolute inset-0 transition-opacity duration-200 ${isOpen ? "opacity-0" : "opacity-100"}`}>
          <SearchFace variant={face} query={next} pending={pending} />
        </div>

        {/* Being edited. */}
        <div
          ref={layer}
          inert={!isOpen}
          className={`absolute left-1/2 top-0 flex -translate-x-1/2 items-stretch transition-opacity duration-200 ${isOpen ? "opacity-100 delay-150" : "opacity-0"}`}
          style={{ width, height: BAR_H }}
        >
          {thumb && (
            <span
              aria-hidden
              className="absolute inset-y-0 rounded-full bg-white shadow-[0_6px_16px_rgba(0,0,0,0.14)] ring-1 ring-line transition-[left,width] duration-300"
              style={{ left: thumb.left, width: thumb.width, transitionTimingFunction: EASE }}
            />
          )}

          <div ref={whereRef} onClick={() => setActive("where")} className={`${seg} !flex-[1.25]`}>
            <label htmlFor="search-where" className="text-xs font-medium">
              Where
            </label>
            <input
              id="search-where"
              ref={input}
              role="combobox"
              aria-expanded={active === "where"}
              aria-controls="search-where-panel"
              autoComplete="off"
              placeholder="Search places"
              value={typed || whereValue}
              // Only when focus comes from another control: coming back to the window focuses the
              // input again with no relatedTarget, and that must not reopen Where.
              onFocus={(e) => e.relatedTarget && setActive("where")}
              onChange={(e) => {
                setTyped(e.target.value);
                if (draft.city) patch({ city: undefined });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  // With something typed, Enter takes the first match; otherwise it searches.
                  const first = document.querySelector<HTMLElement>("#search-where-panel ul button");
                  if (typed && first) first.click();
                  else search();
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  document.querySelector<HTMLElement>("#search-where-panel ul button")?.focus();
                }
              }}
              className="focus-own min-w-0 truncate bg-transparent text-sm outline-none placeholder:text-ink-soft"
            />
            {hasValue(draft, "where") && active === "where" && (
              <button
                type="button"
                aria-label="Clear place"
                onClick={(e) => {
                  e.stopPropagation();
                  patch({ city: undefined });
                  setTyped("");
                  input.current?.focus();
                }}
                className="focus-own absolute right-4 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full hover:bg-sand-deep focus-visible:ring-2 focus-visible:ring-ink"
              >
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <span aria-hidden className={`my-4 w-px bg-line transition-opacity ${active === "where" || active === "when" ? "opacity-0" : ""}`} />

          <div ref={whenRef} className="flex min-w-0 flex-1">
            <button type="button" onClick={() => setActive("when")} className={seg}>
              <span className="text-xs font-medium">When</span>
              <span className={`truncate text-sm ${hasValue(draft, "when") ? "text-ink" : "text-ink-soft"}`}>{whenText}</span>
            </button>
          </div>

          <span aria-hidden className={`my-4 w-px bg-line transition-opacity ${active === "when" || active === "who" ? "opacity-0" : ""}`} />

          <div ref={whoRef} className="flex min-w-0 flex-1 pr-[8.5rem]">
            <button type="button" onClick={() => setActive("who")} className={seg}>
              <span className="text-xs font-medium">Who</span>
              <span className={`truncate text-sm ${hasValue(draft, "who") ? "text-ink" : "text-ink-soft"}`}>{whoText}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={search}
            className="focus-own absolute right-2 top-1/2 z-20 inline-flex h-12 -translate-y-1/2 items-center gap-2 rounded-full bg-brand px-6 font-medium text-white transition hover:brightness-125 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            <Icon name="search" className="h-4 w-4" strokeWidth={2.2} /> Search
          </button>
        </div>
      </div>

      <div className={`absolute z-10 transition-opacity duration-150 ${isOpen ? "opacity-100 delay-200" : "pointer-events-none opacity-0"}`} inert={!isOpen} style={{ left: place.left, top: place.top + BAR_H + 12 }}>
        <div
          key={active}
          id={`search-${active}-panel`}
          className="panel-in absolute overflow-y-auto rounded-3xl bg-white p-6 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.32)] ring-1 ring-line"
          style={{ left: panelBox.left, width: panelBox.width, maxHeight: view.h - place.top - BAR_H - 28 }}
        >
          {panels[active]}
        </div>
      </div>
    </>
  );
}

function Mobile({ open, phase, target, active, setActive, close, search, clear, whereValue, typed, setTyped, whenText, whoText, draft, pending, panels }: LayoutProps & { clear: () => void }) {
  const view = useViewport();
  const cards: { id: Section; title: string; summary: string; open: string }[] = [
    { id: "where", title: "Where", summary: whereValue || "Anywhere", open: "Where to?" },
    { id: "when", title: "When", summary: whenText, open: "When’s your stay?" },
    { id: "who", title: "Who", summary: whoText, open: "Who’s coming?" },
  ];
  // The sheet opens out of the bar that was pressed and closes into it, or into the header's after a search.
  const full = phase === "open" || phase === "go";
  const hole = phase === "settle" && target ? target : open.from;
  const clip = full ? "inset(0px 0px 0px 0px round 0px)" : `inset(${hole.top}px ${view.w - hole.left - hole.width}px ${Math.max(0, view.h - hole.top - hole.height)}px ${hole.left}px round 28px)`;
  const content = `transition-opacity duration-200 ${phase === "open" ? "opacity-100 delay-100" : phase === "go" ? "opacity-60" : "opacity-0"}`;
  return (
    <>
      <div aria-hidden className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${full ? "opacity-100" : "opacity-0"}`} />
      <div className="absolute inset-0 bg-sand-deep" style={{ clipPath: clip, transition: `clip-path ${MOVE_MS}ms ${EASE}` }}>
        <div className={`flex h-full flex-col ${content}`} inert={phase !== "open"}>
          <div className="flex items-center justify-between px-4 pt-4">
            <button type="button" onClick={close} aria-label="Close search" className="focus-own grid h-11 w-11 place-items-center rounded-full bg-white ring-1 ring-line focus-visible:ring-2 focus-visible:ring-ink">
              <Icon name="close" className="h-4 w-4" />
            </button>
            <p className="text-base">Search stays</p>
            <span className="w-11" />
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {cards.map((c) =>
              active === c.id ? (
                <section key={c.id} className="panel-in rounded-3xl bg-white p-5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.3)] ring-1 ring-line">
                  <h2 className="text-h2">{c.open}</h2>
                  {c.id === "where" && (
                    <div className="mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ring-field focus-within:ring-2 focus-within:ring-ink">
                      <Icon name="search" className="h-4 w-4 shrink-0 text-ink-soft" />
                      <input
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        placeholder="Search places"
                        aria-label="Search places"
                        autoComplete="off"
                        className="focus-own w-full bg-transparent text-base outline-none"
                      />
                    </div>
                  )}
                  <div className="mt-4">{panels[c.id]}</div>
                </section>
              ) : (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActive(c.id)}
                  className="focus-own flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 text-left shadow-[0_4px_14px_-8px_rgba(0,0,0,0.3)] ring-1 ring-line focus-visible:ring-2 focus-visible:ring-ink"
                >
                  <span className="text-sm text-ink-soft">{c.title}</span>
                  <span className={`min-w-0 truncate text-sm ${hasValue(draft, c.id) ? "text-ink" : "text-ink-soft"}`}>{c.summary}</span>
                </button>
              ),
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={clear} className="min-h-11 text-base underline underline-offset-4">
              Clear all
            </button>
            <button type="button" onClick={search} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-7 font-medium text-white hover:brightness-125">
              <Icon name="search" className={`h-4 w-4 ${pending ? "animate-pulse" : ""}`} strokeWidth={2.2} /> Search
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
