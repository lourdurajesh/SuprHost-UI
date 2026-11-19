"use client";

import Image from "next/image";
import { useRef } from "react";
import type { ListingImage } from "@/lib/pms/types";
import { Icon } from "./icons";
import { skipOptimizer } from "@/themes/escape/listing-media";

// "Show all photos": native <dialog> (focus trap, Esc to close, no library). Images inside load
// lazily, so the listing page pays nothing until the guest opens the tour.
// `children` is the page's own gallery: any element inside it with `data-photo={index}` (a button)
// opens the tour at that photo.
export function PhotoTour({ images, name, children }: { images: ListingImage[]; name: string; children?: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  if (images.length === 0) return <>{children}</>;

  function open(index?: number) {
    dialog.current?.showModal();
    if (index) requestAnimationFrame(() => document.getElementById(`tour-photo-${index}`)?.scrollIntoView({ block: "start" }));
  }

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
        onClick={() => open()}
        className="absolute left-4 top-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-sm font-medium text-ink shadow-lg backdrop-blur transition hover:bg-white lg:left-auto lg:right-4 lg:top-auto lg:bottom-4"
      >
        <Icon name="grid" className="h-4 w-4" /> Show all {images.length} photos
      </button>
      <dialog
        ref={dialog}
        aria-label={`Photos of ${name}`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-sand p-0 backdrop:bg-black/60"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-sand/90 px-4 py-3 backdrop-blur sm:px-8">
          <p className="font-display text-lg">{name}</p>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-sand-deep"
            aria-label="Close photos"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="mx-auto grid max-w-4xl gap-3 px-4 py-6 sm:grid-cols-2 sm:px-8">
          {images.map((img, i) => (
            <figure key={`${img.url}-${i}`} id={`tour-photo-${i}`} className={`scroll-mt-20 ${i % 3 === 0 ? "sm:col-span-2" : ""}`}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand-deep">
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  loading="lazy"
                  sizes="(min-width: 640px) 900px, 100vw"
                  unoptimized={skipOptimizer(img.url)}
                  className="object-cover"
                />
              </div>
              {img.alt && <figcaption className="mt-2 text-sm text-ink-soft">{img.alt}</figcaption>}
            </figure>
          ))}
        </div>
      </dialog>
    </div>
  );
}
