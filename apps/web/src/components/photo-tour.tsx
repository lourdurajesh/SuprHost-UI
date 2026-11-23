"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ListingImage } from "@/lib/pms/types";
import { Icon } from "./icons";
import { PhotoImage } from "./photo-image";
import { photoChips } from "@/lib/photo-categories";
import { mediaSrc, skipOptimizer } from "@/themes/escape/listing-media";

const MAX_ZOOM = 4;
type View = { s: number; x: number; y: number };
const FIT: View = { s: 1, x: 0, y: 0 };

// Photo slideshow in a native <dialog> (focus trap, Esc to close, no library). One photo at a time:
// ← → keys, arrow buttons, swipe or the thumbnail strip move between photos; the mouse wheel zooms
// around the pointer (up to 4×), dragging moves a zoomed photo, double-click toggles zoom, and
// + / − / 0 zoom from the keyboard. `children` is the page's own gallery: any element inside it
// with `data-photo={index}` opens the slideshow at that photo. Images load only when it opens.
export function PhotoTour({ images, name, children }: { images: ListingImage[]; name: string; children?: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  // One pointer-event path for mouse, pen and touch: pan, pinch, swipe and double-tap.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const lastPointerType = useRef("mouse");
  const [index, setIndex] = useState(0);
  const [isOpen, setOpen] = useState(false);
  const [view, setView] = useState<View>(FIT);
  const [dragging, setDragging] = useState(false);
  // Event handlers read the latest view without re-binding on every zoom step.
  const viewRef = useRef<View>(FIT);
  const count = images.length;

  /** Show photo i at fit size. */
  const show = useCallback((i: number) => {
    setIndex(((i % count) + count) % count);
    setView(FIT);
  }, [count]);
  const go = useCallback((dir: 1 | -1) => {
    setView(FIT);
    setIndex((i) => (i + dir + count) % count);
  }, [count]);

  /** Zoom to scale s2, keeping the screen point (clientX, clientY) still; centre when no point. */
  const zoomTo = useCallback((s2: number, clientX?: number, clientY?: number) => {
    const el = stage.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setView((v) => {
      const s = Math.min(MAX_ZOOM, Math.max(1, s2));
      if (s === 1) return FIT;
      const px = (clientX ?? r.left + r.width / 2) - (r.left + r.width / 2);
      const py = (clientY ?? r.top + r.height / 2) - (r.top + r.height / 2);
      // Image point under the pointer stays under it: p = t + s·q.
      const qx = (px - v.x) / v.s;
      const qy = (py - v.y) / v.s;
      return clamp({ s, x: px - s * qx, y: py - s * qy }, r);
    });
  }, []);

  // Wheel zoom needs a non-passive listener to stop the page behind from scrolling.
  useEffect(() => {
    const el = stage.current;
    if (!isOpen || !el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomTo(viewRef.current.s * factor, e.clientX, e.clientY);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isOpen, zoomTo]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // Closing goes through state so buttons never touch the dialog ref during render.
  useEffect(() => {
    if (!isOpen) dialog.current?.close();
  }, [isOpen]);

  // Keep the active thumbnail in view.
  useEffect(() => {
    if (!isOpen) return;
    strip.current?.querySelector<HTMLElement>(`[data-thumb="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [index, isOpen]);

  /** (Re)start the gesture for the pointers now down: two fingers pinch, one pans when zoomed, else swipes. */
  function startGesture() {
    const v = viewRef.current;
    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      const [a, b] = pts;
      gesture.current = { kind: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: v.s, x: v.x, y: v.y, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    } else if (pts.length === 1) {
      gesture.current = { kind: v.s > 1 ? "pan" : "swipe", px: pts[0].x, py: pts[0].y, x: v.x, y: v.y, moved: 0 };
    } else {
      gesture.current = null;
    }
    setDragging(gesture.current?.kind === "pan");
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Buttons (arrows) keep their own clicks: capturing here would swallow them.
    if ((e.target as HTMLElement).closest("button")) return;
    lastPointerType.current = e.pointerType;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
    startGesture();
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId) || !stage.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const r = stage.current.getBoundingClientRect();
    if (!g) return;
    if (g.kind === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!b) return;
      const s = Math.min(MAX_ZOOM, Math.max(1, (g.s * Math.hypot(a.x - b.x, a.y - b.y)) / g.d));
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      // The image point first under the fingers' midpoint follows the midpoint as it moves.
      const qx = (g.mx - cx - g.x) / g.s;
      const qy = (g.my - cy - g.y) / g.s;
      const mx = (a.x + b.x) / 2 - cx;
      const my = (a.y + b.y) / 2 - cy;
      setView(s === 1 ? FIT : clamp({ s, x: mx - s * qx, y: my - s * qy }, r));
      return;
    }
    const dx = e.clientX - g.px;
    const dy = e.clientY - g.py;
    g.moved = Math.max(g.moved, Math.hypot(dx, dy));
    if (g.kind === "pan") setView((v) => clamp({ s: v.s, x: g.x + dx, y: g.y + dy }, r));
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (g && g.kind !== "pinch" && pointers.current.size === 0) {
      const dx = e.clientX - g.px;
      const dy = e.clientY - g.py;
      if (g.kind === "swipe" && e.pointerType !== "mouse" && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        go(dx < 0 ? 1 : -1);
      } else if (g.moved < 10 && e.pointerType !== "mouse") {
        // Double-tap toggles zoom on touch screens (mouse uses dblclick).
        const now = Date.now();
        const t = lastTap.current;
        if (t && now - t.t < 300 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 30) {
          if (viewRef.current.s > 1) setView(FIT);
          else zoomTo(2.5, e.clientX, e.clientY);
          lastTap.current = null;
        } else {
          lastTap.current = { t: now, x: e.clientX, y: e.clientY };
        }
      }
    }
    startGesture();
  }

  function open(at = 0) {
    show(at);
    setOpen(true);
    dialog.current?.showModal();
  }

  if (count === 0) return <>{children}</>;
  const current = images[index];
  const chips = photoChips(images);
  const next = images[(index + 1) % count];
  const zoomed = view.s > 1;

  return (
    <div className="relative">
      <div
        onClick={(e) => {
          const tile = (e.target as HTMLElement).closest<HTMLElement>("[data-photo]");
          if (tile) open(Number(tile.dataset.photo));
        }}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => open(0)}
        className="absolute left-4 top-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-sm font-medium text-ink shadow-lg backdrop-blur transition hover:bg-white lg:left-auto lg:right-4 lg:top-auto lg:bottom-4"
      >
        <Icon name="grid" className="h-4 w-4" /> Show all {count} photos
      </button>

      <dialog
        ref={dialog}
        aria-label={`Photos of ${name}`}
        onClose={() => setOpen(false)}
        onKeyDown={(e) => {
          const keys: Record<string, () => void> = {
            ArrowRight: () => go(1),
            ArrowLeft: () => go(-1),
            "+": () => zoomTo(view.s * 1.5),
            "=": () => zoomTo(view.s * 1.5),
            "-": () => zoomTo(view.s / 1.5),
            "0": () => setView(FIT),
          };
          const action = keys[e.key];
          if (action) {
            e.preventDefault();
            action();
          }
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-[#141312] p-0 text-white backdrop:bg-black/80"
      >
        {isOpen && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <p className="min-w-0 truncate text-base">{name}</p>
              <p className="shrink-0 text-sm tabular-nums text-white/70" aria-live="polite">
                {index + 1} / {count}
                {zoomed && <span className="ml-2">· {Math.round(view.s * 100)}%</span>}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                {zoomed && (
                  <TapButton onPress={() => setView(FIT)} className="min-h-11 rounded-full px-3 text-sm hover:bg-white/10">
                    Reset zoom
                  </TapButton>
                )}
                <TapButton
                  onPress={() => setOpen(false)}
                  className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10"
                  aria-label="Close photos"
                >
                  <Icon name="close" />
                </TapButton>
              </div>
            </div>

            {/* Jump to a room or area. Shown only when the host has filed photos under 2+ categories. */}
            {chips.length > 0 && (
              <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 sm:justify-center sm:px-6" role="group" aria-label="Jump to">
                {chips.map((c) => {
                  const on = current.category === c.slug;
                  return (
                    <TapButton
                      key={c.slug}
                      onPress={() => show(c.first)}
                      aria-pressed={on}
                      className={`min-h-11 shrink-0 rounded-full px-4 text-sm transition ${on ? "bg-white text-ink" : "bg-white/10 text-white hover:bg-white/20"}`}
                    >
                      {c.label} <span className={on ? "text-ink/60" : "text-white/60"}>{c.count}</span>
                    </TapButton>
                  );
                })}
              </div>
            )}

            <div
              ref={stage}
              className={`relative min-h-0 flex-1 touch-none select-none overflow-hidden ${zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"}`}
              onDoubleClick={(e) => {
                if (lastPointerType.current !== "mouse" || (e.target as HTMLElement).closest("button")) return;
                if (zoomed) setView(FIT);
                else zoomTo(2.5, e.clientX, e.clientY);
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div
                className={`absolute inset-0 will-change-transform ${dragging ? "" : "transition-transform duration-150 ease-out"}`}
                style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}
              >
                <PhotoImage
                  key={`${current.url}-${index}`}
                  src={mediaSrc(current.url)}
                  alt={current.alt || `${name}, photo ${index + 1} of ${count}`}
                  fill
                  sizes="100vw"
                  priority
                  draggable={false}
                  unoptimized={skipOptimizer(current.url)}
                  className="object-contain"
                />
              </div>
              {/* Warm the next photo so moving forward feels instant. */}
              {count > 1 && <Image src={mediaSrc(next.url)} alt="" aria-hidden fill sizes="100vw" unoptimized={skipOptimizer(next.url)} className="invisible" />}
              {count > 1 && (
                <>
                  <TapButton
                    onPress={() => go(-1)}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-lg transition hover:bg-white sm:left-6"
                  >
                    <Icon name="arrowLeft" />
                  </TapButton>
                  <TapButton
                    onPress={() => go(1)}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-lg transition hover:bg-white sm:right-6"
                  >
                    <Icon name="arrowRight" />
                  </TapButton>
                </>
              )}
            </div>

            <p className="hidden px-4 pt-3 text-center text-xs text-white/55 sm:block">
              {current.alt && <span className="mr-3 text-sm text-white/80">{current.alt}</span>}
              Scroll to zoom · drag to move · ← → next and previous
            </p>
            <p className="px-4 pt-3 text-center text-xs text-white/55 sm:hidden">
              {current.alt && <span className="block text-sm text-white/80">{current.alt}</span>}
              Swipe for next · pinch or double-tap to zoom
            </p>

            {count > 1 && (
              <div ref={strip} className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-4 sm:justify-center sm:px-6" role="group" aria-label="Choose a photo">
                {images.map((img, i) => (
                  <TapButton
                    key={`${img.url}-${i}`}
                    data-thumb={i}
                    onPress={() => show(i)}
                    aria-label={`Photo ${i + 1} of ${count}`}
                    aria-current={i === index ? "true" : undefined}
                    className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition sm:h-16 sm:w-24 ${
                      i === index ? "opacity-100 ring-2 ring-white ring-offset-2 ring-offset-[#141312]" : "opacity-55 hover:opacity-90"
                    }`}
                  >
                    <Image src={mediaSrc(img.url)} alt="" fill sizes="96px" unoptimized={skipOptimizer(img.url)} className="object-cover" />
                  </TapButton>
                ))}
              </div>
            )}
          </div>
        )}
      </dialog>
    </div>
  );
}

// Phones: a click right after a pinch or drag may never arrive (arrows felt dead), and acting on
// pointer-up instead lets the late click hit whatever is underneath (a ghost tap on the page menu
// after Close). So a touch tap waits briefly for its click and runs the action exactly once: on
// that click, or after 350 ms if the browser dropped it. Mouse and keyboard use click alone.
function TapButton({ onPress, ...props }: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "onPointerUp"> & { onPress: () => void }) {
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <button
      type="button"
      {...props}
      onPointerUp={(e) => {
        if (e.pointerType === "mouse") return;
        if (pending.current) clearTimeout(pending.current);
        pending.current = setTimeout(() => {
          pending.current = null;
          onPress();
        }, 350);
      }}
      onClick={() => {
        if (pending.current) {
          clearTimeout(pending.current);
          pending.current = null;
        }
        onPress();
      }}
    />
  );
}

type Gesture =
  | { kind: "pinch"; d: number; s: number; x: number; y: number; mx: number; my: number }
  | { kind: "pan" | "swipe"; px: number; py: number; x: number; y: number; moved: number };

/** Keep a zoomed photo covering the stage: it can move at most (s − 1)/2 of the stage each way. */
function clamp(v: View, r: DOMRect): View {
  const mx = ((v.s - 1) * r.width) / 2;
  const my = ((v.s - 1) * r.height) / 2;
  return { s: v.s, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
}
