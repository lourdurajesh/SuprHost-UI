"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

interface Props {
  children: React.ReactNode;
  /** Tailwind width classes for each slide, e.g. "w-[85%] sm:w-[calc((100%-2rem)/2)]". */
  slideClassName: string;
  label: string;
  /** Arrow placement: over the slides' vertical middle, or in a row above them. */
  arrows?: "overlay" | "header";
  arrowTone?: "light" | "dark";
  counter?: boolean;
  gapClassName?: string;
  className?: string;
}

// Native scroll-snap carousel: swipe and trackpad scrolling work without JS; the arrows and the
// counter are the only scripted parts. Slides render on the server.
export function Carousel({
  children,
  slideClassName,
  label,
  arrows = "overlay",
  arrowTone = "light",
  counter = false,
  gapClassName = "gap-6",
  className = "",
}: Props) {
  const track = useRef<HTMLDivElement>(null);
  const slides = Children.toArray(children);
  const [index, setIndex] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: slides.length <= 1 });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth : el.clientWidth;
    setIndex(Math.round(el.scrollLeft / Math.max(step, 1)));
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  function go(dir: 1 | -1) {
    const el = track.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: dir * (first ? first.offsetWidth : el.clientWidth), behavior: "smooth" });
  }

  const btn =
    arrowTone === "light"
      ? "bg-white/95 text-ink shadow-md hover:bg-white"
      : "bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20";

  const arrow = (dir: 1 | -1) => (
    <button
      type="button"
      onClick={() => go(dir)}
      disabled={dir === -1 ? edges.start : edges.end}
      aria-label={dir === -1 ? "Previous" : "Next"}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition disabled:pointer-events-none disabled:opacity-0 ${btn}`}
    >
      <Icon name="arrowRight" className={`h-4 w-4 ${dir === -1 ? "rotate-180" : ""}`} />
    </button>
  );

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} className={`relative ${className}`}>
      {arrows === "header" && slides.length > 1 && (
        <div className="absolute -top-16 right-0 hidden gap-2 sm:flex">
          {arrow(-1)}
          {arrow(1)}
        </div>
      )}
      <div ref={track} className={`no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth ${gapClassName}`}>
        {slides.map((s, i) => (
          <div key={i} className={`shrink-0 snap-start ${slideClassName}`} aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`}>
            {s}
          </div>
        ))}
      </div>
      {arrows === "overlay" && slides.length > 1 && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center [&>*]:pointer-events-auto">
            {arrow(-1)}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center [&>*]:pointer-events-auto">
            {arrow(1)}
          </div>
        </>
      )}
      {counter && slides.length > 1 && (
        <span className="absolute bottom-4 right-4 rounded-full bg-black/55 px-3 py-1 text-xs text-white backdrop-blur">
          {Math.min(index + 1, slides.length)} / {slides.length}
        </span>
      )}
    </div>
  );
}
