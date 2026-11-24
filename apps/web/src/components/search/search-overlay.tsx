"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SearchQuery } from "@/lib/pms/types";
import { describeWhen } from "@/lib/search-query";
import { Icon } from "../icons";
import { applyDraft, draftFrom, EMPTY_DRAFT, type Draft } from "./draft";
import { WhenPanel } from "./when-panel";
import { WherePanel, type Place } from "./where-panel";
import { WhoPanel } from "./who-panel";

export type Section = "where" | "when" | "who";

const CLOSE_MS = 180;

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia("(min-width: 640px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useWide = () => useSyncExternalStore(subscribe, () => window.matchMedia("(min-width: 640px)").matches, () => true);

interface Props {
  query: SearchQuery;
  places: Place[];
  timezone: string;
  initial: Section;
  onApply: (next: SearchQuery) => void;
  onClose: () => void;
}

/**
 * The search panel. On larger screens the compact bar "comes down" into a big Where | When | Who bar
 * under a dimmed page; a white thumb slides to whichever segment is being edited and its panel
 * opens below. On phones it is a full-screen sheet of three cards, one open at a time. Nothing
 * reaches the URL until "Search".
 */
export function SearchOverlay({ query, places, timezone, initial, onApply, onClose }: Props) {
  const wide = useWide();
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<Section>(initial);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(query));
  const [typed, setTyped] = useState("");
  const [shown, setShown] = useState(false);
  const closing = useRef(false);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (!el.open) el.showModal();
    const id = requestAnimationFrame(() => setShown(true));
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      html.style.overflow = before;
    };
  }, []);

  function search() {
    onApply(applyDraft(draft, query));
    close();
  }

  const whereValue = draft.city ?? "";
  const whenText = describeWhen(applyDraft(draft, {}), true);
  const guests = draft.adults + draft.children;
  const whoText = guests ? `${guests} guest${guests === 1 ? "" : "s"}` : "Add guests";

  const panels = {
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
  } as const;

  return (
    <dialog
      ref={dialog}
      aria-label="Search stays"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-ink backdrop:bg-transparent"
    >
      {wide ? (
        <Desktop
          shown={shown}
          active={active}
          setActive={setActive}
          close={close}
          search={search}
          clear={() => {
            setDraft(EMPTY_DRAFT);
            setTyped("");
          }}
          whereValue={whereValue}
          typed={typed}
          setTyped={setTyped}
          whenText={whenText}
          whoText={whoText}
          draft={draft}
          patch={patch}
          panels={panels}
        />
      ) : (
        <Mobile
          shown={shown}
          active={active}
          setActive={setActive}
          close={close}
          search={search}
          clear={() => {
            setDraft(EMPTY_DRAFT);
            setTyped("");
          }}
          whereValue={whereValue}
          typed={typed}
          setTyped={setTyped}
          whenText={whenText}
          whoText={whoText}
          draft={draft}
          panels={panels}
        />
      )}
    </dialog>
  );
}

interface LayoutProps {
  shown: boolean;
  active: Section;
  setActive: (s: Section) => void;
  close: () => void;
  search: () => void;
  clear: () => void;
  whereValue: string;
  typed: string;
  setTyped: (v: string) => void;
  whenText: string;
  whoText: string;
  draft: Draft;
  panels: Record<Section, React.ReactNode>;
}

const hasValue = (d: Draft, s: Section) =>
  s === "where" ? Boolean(d.city) : s === "when" ? Boolean(d.checkIn || d.stay || d.months.length) : d.adults + d.children > 0;

function Desktop({ shown, active, setActive, close, search, whereValue, typed, setTyped, whenText, whoText, draft, patch, panels }: LayoutProps & { patch: (p: Partial<Draft>) => void }) {
  const bar = useRef<HTMLDivElement>(null);
  const whereRef = useRef<HTMLDivElement>(null);
  const whenRef = useRef<HTMLDivElement>(null);
  const whoRef = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [geo, setGeo] = useState<{ rects: Record<Section, { left: number; width: number }>; barWidth: number } | null>(null);

  // Where the white thumb and the panels go: measured from the real segments, so it follows any width.
  useLayoutEffect(() => {
    const measure = () => {
      const barBox = bar.current?.getBoundingClientRect();
      if (!barBox) return;
      const r = (el: HTMLDivElement | null) => {
        const b = el!.getBoundingClientRect();
        return { left: b.left - barBox.left, width: b.width };
      };
      setGeo({ rects: { where: r(whereRef.current), when: r(whenRef.current), who: r(whoRef.current) }, barWidth: barBox.width });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (active === "where") input.current?.focus();
  }, [active]);

  const thumb = geo?.rects[active];
  const panelBox = geo
    ? active === "where"
      ? { left: geo.rects.where.left, width: Math.min(432, geo.barWidth - geo.rects.where.left) }
      : active === "when"
        ? { left: 0, width: geo.barWidth }
        : { left: Math.max(0, geo.barWidth - 400), width: Math.min(400, geo.barWidth) }
    : { left: 0, width: 0 };

  const seg = (s: Section, flex: string) =>
    `relative z-10 flex min-w-0 ${flex} cursor-pointer flex-col justify-center rounded-full px-7 py-3 text-left outline-none focus-within:outline-none`;

  return (
    <>
      <div
        className={`absolute inset-0 bg-black/35 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
        onClick={close}
        aria-hidden
      />
      <div
        className={`absolute inset-x-0 top-0 origin-top bg-white shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition duration-200 ease-out ${
          shown ? "translate-y-0 scale-100 opacity-100" : "-translate-y-3 scale-[0.97] opacity-0"
        }`}
      >
        <div className="mx-auto max-w-[56rem] px-4 pb-7 pt-5">
          <div className="mb-4 flex justify-end">
            <button type="button" onClick={close} aria-label="Close search" className="focus-own grid h-10 w-10 place-items-center rounded-full ring-1 ring-line hover:ring-ink focus-visible:ring-2 focus-visible:ring-ink">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>

          <div className="relative">
            <div ref={bar} className="relative flex items-stretch rounded-full bg-sand-deep p-0 ring-1 ring-line">
              {thumb && (
                <span
                  aria-hidden
                  className="absolute inset-y-0 rounded-full bg-white shadow-[0_6px_16px_rgba(0,0,0,0.14)] ring-1 ring-line transition-[left,width] duration-300 ease-[cubic-bezier(0.3,0.8,0.2,1)]"
                  style={{ left: thumb.left, width: thumb.width }}
                />
              )}

              <div ref={whereRef} onClick={() => setActive("where")} className={seg("where", "flex-[1.25]")}>
                <label htmlFor="search-where" className="text-xs font-medium">
                  Where
                </label>
                <input
                  id="search-where"
                  ref={input}
                  role="combobox"
                  aria-expanded={active === "where"}
                  aria-controls="search-where-list"
                  autoComplete="off"
                  placeholder="Search places"
                  value={typed || whereValue}
                  onFocus={() => setActive("where")}
                  onChange={(e) => {
                    setTyped(e.target.value);
                    if (draft.city) patch({ city: undefined });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      document.querySelector<HTMLElement>("#search-where-panel ul button")?.click();
                    }
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      document.querySelector<HTMLElement>("#search-where-panel ul button")?.focus();
                    }
                  }}
                  className="focus-own min-w-0 truncate bg-transparent text-sm outline-none placeholder:text-ink-soft"
                />
                {hasValue(draft, "where") && active === "where" && (
                  <button type="button" aria-label="Clear place" onClick={(e) => { e.stopPropagation(); patch({ city: undefined }); setTyped(""); input.current?.focus(); }} className="focus-own absolute right-4 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full hover:bg-sand-deep focus-visible:ring-2 focus-visible:ring-ink">
                    <Icon name="close" className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <span aria-hidden className={`my-3 w-px bg-line transition-opacity ${active === "where" || active === "when" ? "opacity-0" : ""}`} />

              <div ref={whenRef} className="flex min-w-0 flex-1">
                <button type="button" onClick={() => setActive("when")} className={`${seg("when", "flex-1")} focus-own focus-visible:ring-2 focus-visible:ring-ink`}>
                  <span className="text-xs font-medium">When</span>
                  <span className={`truncate text-sm ${hasValue(draft, "when") ? "text-ink" : "text-ink-soft"}`}>{whenText}</span>
                </button>
              </div>

              <span aria-hidden className={`my-3 w-px bg-line transition-opacity ${active === "when" || active === "who" ? "opacity-0" : ""}`} />

              <div ref={whoRef} className="flex min-w-0 flex-1 pr-[8.5rem]">
                <button type="button" onClick={() => setActive("who")} className={`${seg("who", "flex-1")} focus-own focus-visible:ring-2 focus-visible:ring-ink`}>
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

            <div
              key={active}
              id={`search-${active}-panel`}
              className="panel-in absolute top-full z-30 mt-3 max-h-[calc(100dvh-10rem)] overflow-y-auto rounded-3xl bg-white p-6 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.32)] ring-1 ring-line"
              style={{ left: panelBox.left, width: panelBox.width }}
            >
              {panels[active]}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Mobile({ shown, active, setActive, close, search, clear, whereValue, typed, setTyped, whenText, whoText, draft, panels }: LayoutProps) {
  const cards: { id: Section; title: string; summary: string; open: string }[] = [
    { id: "where", title: "Where", summary: whereValue || "Anywhere", open: "Where to?" },
    { id: "when", title: "When", summary: whenText, open: "When’s your stay?" },
    { id: "who", title: "Who", summary: whoText, open: "Who’s coming?" },
  ];
  return (
    <div
      className={`absolute inset-0 flex flex-col bg-sand-deep transition duration-200 ease-out ${shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
    >
      <div className="flex items-center justify-between px-4 pt-4">
        <button type="button" onClick={close} aria-label="Close search" className="focus-own grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-line focus-visible:ring-2 focus-visible:ring-ink">
          <Icon name="close" className="h-4 w-4" />
        </button>
        <p className="text-base">Search stays</p>
        <span className="w-10" />
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
                    autoFocus
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
          <Icon name="search" className="h-4 w-4" strokeWidth={2.2} /> Search
        </button>
      </div>
    </div>
  );
}
