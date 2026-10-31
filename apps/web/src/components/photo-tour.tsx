"use client";

import Image from "next/image";
import { useRef } from "react";
import type { ListingImage } from "@/lib/pms/types";
import { Icon } from "./icons";

// "Show all photos": native <dialog> (focus trap, Esc to close, no library). Images inside load
// lazily, so the listing page pays nothing until the guest opens the tour.
export function PhotoTour({ images, name }: { images: ListingImage[]; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  if (images.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-sm font-medium text-ink shadow-lg backdrop-blur transition hover:bg-white"
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
            <figure key={`${img.url}-${i}`} className={i % 3 === 0 ? "sm:col-span-2" : ""}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand-deep">
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  loading="lazy"
                  sizes="(min-width: 640px) 900px, 100vw"
                  unoptimized={img.url.endsWith(".svg")}
                  className="object-cover"
                />
              </div>
              {img.alt && <figcaption className="mt-2 text-sm text-ink-soft">{img.alt}</figcaption>}
            </figure>
          ))}
        </div>
      </dialog>
    </>
  );
}
