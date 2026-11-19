"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ListingImage } from "@/lib/pms/types";
import { Icon } from "./icons";
import { skipOptimizer } from "@/themes/escape/listing-media";

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
  const touchX = useRef<number | null>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [index, setIndex] = useState(0);
  const [isOpen, setOpen] = useState(false);
  const [view, setView] = useState<View>(FIT);
  const [dragging, setDragging] = useState(false);
  // The wheel handler reads the latest scale without re-binding on every zoom step.
  const currentScale = useRef(1);
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
      zoomTo(currentScale.current * factor, e.clientX, e.clientY);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isOpen, zoomTo]);

  useEffect(() => {
    currentScale.current = view.s;
  }, [view.s]);

  // Keep the active thumbnail in view.
  useEffect(() => {
    if (!isOpen) return;
    strip.current?.querySelector<HTMLElement>(`[data-thumb="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [index, isOpen]);

  function open(at = 0) {
    show(at);
    setOpen(true);
    dialog.current?.showModal();
  }

  if (count === 0) return <>{children}</>;
  const current = images[index];
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
                  <button type="button" onClick={() => setView(FIT)} className="min-h-11 rounded-full px-3 text-sm hover:bg-white/10">
                    Reset zoom
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dialog.current?.close()}
                  className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10"
                  aria-label="Close photos"
                >
                  <Icon name="close" />
                </button>
              </div>
            </div>

            <div
              ref={stage}
              className={`relative min-h-0 flex-1 touch-none select-none overflow-hidden ${zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"}`}
              onDoubleClick={(e) => (zoomed ? setView(FIT) : zoomTo(2.5, e.clientX, e.clientY))}
              onPointerDown={(e) => {
                if (!zoomed || e.pointerType === "touch") return;
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y };
                setDragging(true);
              }}
              onPointerMove={(e) => {
                const d = drag.current;
                if (!d || !stage.current) return;
                const r = stage.current.getBoundingClientRect();
                setView((v) => clamp({ s: v.s, x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py }, r));
              }}
              onPointerUp={() => {
                drag.current = null;
                setDragging(false);
              }}
              onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (touchX.current === null || zoomed) return;
                const dx = e.changedTouches[0].clientX - touchX.current;
                touchX.current = null;
                if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
              }}
            >
              <div
                className={`absolute inset-0 will-change-transform ${dragging ? "" : "transition-transform duration-150 ease-out"}`}
                style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}
              >
                <Image
                  key={`${current.url}-${index}`}
                  src={current.url}
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
              {count > 1 && <Image src={next.url} alt="" aria-hidden fill sizes="100vw" unoptimized={skipOptimizer(next.url)} className="invisible" />}
              {count > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    onDoubleClick={(e) => e.stopPropagation()}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-lg transition hover:bg-white sm:left-6"
                  >
                    <Icon name="arrowLeft" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    onDoubleClick={(e) => e.stopPropagation()}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-lg transition hover:bg-white sm:right-6"
                  >
                    <Icon name="arrowRight" />
                  </button>
                </>
              )}
            </div>

            <p className="hidden px-4 pt-3 text-center text-xs text-white/55 sm:block">
              {current.alt && <span className="mr-3 text-sm text-white/80">{current.alt}</span>}
              Scroll to zoom · drag to move · ← → next and previous
            </p>
            {current.alt && <p className="px-4 pt-3 text-center text-sm text-white/80 sm:hidden">{current.alt}</p>}

            {count > 1 && (
              <div ref={strip} className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-4 sm:justify-center sm:px-6" role="group" aria-label="Choose a photo">
                {images.map((img, i) => (
                  <button
                    key={`${img.url}-${i}`}
                    type="button"
                    data-thumb={i}
                    onClick={() => show(i)}
                    aria-label={`Photo ${i + 1} of ${count}`}
                    aria-current={i === index ? "true" : undefined}
                    className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition sm:h-16 sm:w-24 ${
                      i === index ? "opacity-100 ring-2 ring-white ring-offset-2 ring-offset-[#141312]" : "opacity-55 hover:opacity-90"
                    }`}
                  >
                    <Image src={img.url} alt="" fill sizes="96px" unoptimized={skipOptimizer(img.url)} className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </dialog>
    </div>
  );
}

/** Keep a zoomed photo covering the stage: it can move at most (s − 1)/2 of the stage each way. */
function clamp(v: View, r: DOMRect): View {
  const mx = ((v.s - 1) * r.width) / 2;
  const my = ((v.s - 1) * r.height) / 2;
  return { s: v.s, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
}
