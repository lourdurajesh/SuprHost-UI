"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ListingImage } from "@/lib/pms/types";
import { Icon } from "./icons";
import { skipOptimizer } from "@/themes/escape/listing-media";

// Photo slideshow in a native <dialog> (focus trap, Esc to close, no library). One photo at a time
// with previous/next arrows, ← → keys, swipe on touch screens and a thumbnail strip to jump to any
// photo. `children` is the page's own gallery: any element inside it with `data-photo={index}`
// opens the slideshow at that photo. Images load only when the slideshow opens.
export function PhotoTour({ images, name, children }: { images: ListingImage[]; name: string; children?: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const [isOpen, setOpen] = useState(false);
  const count = images.length;

  const go = useCallback((dir: 1 | -1) => setIndex((i) => (i + dir + count) % count), [count]);

  function open(at = 0) {
    setIndex(at);
    setOpen(true);
    dialog.current?.showModal();
  }

  // Keep the active thumbnail in view.
  useEffect(() => {
    if (!isOpen) return;
    strip.current?.querySelector<HTMLElement>(`[data-thumb="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [index, isOpen]);

  if (count === 0) return <>{children}</>;
  const current = images[index];
  const next = images[(index + 1) % count];

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
          if (e.key === "ArrowRight") {
            e.preventDefault();
            go(1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(-1);
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
              </p>
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/10"
                aria-label="Close photos"
              >
                <Icon name="close" />
              </button>
            </div>

            <div
              className="relative min-h-0 flex-1 select-none"
              onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (touchX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchX.current;
                touchX.current = null;
                if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
              }}
            >
              <Image
                key={`${current.url}-${index}`}
                src={current.url}
                alt={current.alt || `${name}, photo ${index + 1} of ${count}`}
                fill
                sizes="100vw"
                priority
                unoptimized={skipOptimizer(current.url)}
                className="object-contain"
              />
              {/* Warm the next photo so moving forward feels instant. */}
              {count > 1 && <Image src={next.url} alt="" aria-hidden fill sizes="100vw" unoptimized={skipOptimizer(next.url)} className="invisible" />}
              {count > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-lg transition hover:bg-white sm:left-6"
                  >
                    <Icon name="arrowLeft" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-lg transition hover:bg-white sm:right-6"
                  >
                    <Icon name="arrowRight" />
                  </button>
                </>
              )}
            </div>

            {current.alt && <p className="px-4 pt-3 text-center text-sm text-white/80">{current.alt}</p>}

            {count > 1 && (
              <div ref={strip} className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-4 sm:justify-center sm:px-6" role="group" aria-label="Choose a photo">
                {images.map((img, i) => (
                  <button
                    key={`${img.url}-${i}`}
                    type="button"
                    data-thumb={i}
                    onClick={() => setIndex(i)}
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
