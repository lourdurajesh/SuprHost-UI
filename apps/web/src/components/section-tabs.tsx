"use client";

import { useEffect, useRef, useState } from "react";

type Tab = { id: string; label: string; desktopOnly?: boolean };

// Sticky jump links for a listing page. The section in view is underlined and kept scrolled into
// view in the tab row, so on a phone the row always shows where the guest is, and a fade on the
// right edge says more tabs sit off-screen.
export function SectionTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const [moreRight, setMoreRight] = useState(false);
  const row = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sections in page order. The booking card is left out: on desktop it sits beside the content
    // and is always "in view", so it would win every time.
    const els = tabs
      .filter((t) => !t.desktopOnly)
      .map((t) => document.getElementById(t.id))
      .filter((e): e is HTMLElement => e !== null)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    // The active section is the last one whose top has passed the header and tab row (~140px).
    const onScroll = () => {
      let current = els[0]?.id;
      for (const el of els) if (el.getBoundingClientRect().top <= 150) current = el.id;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = els[els.length - 1]?.id ?? current;
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [tabs]);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const update = () => setMoreRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const el = row.current;
    const link = el?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!el || !link) return;
    const left = link.offsetLeft - el.clientWidth / 2 + link.offsetWidth / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  return (
    <nav aria-label="Sections" className="sticky top-[76px] z-30 -mx-4 border-b border-line bg-white sm:-mx-6 lg:-mx-8">
      <div ref={row} className="no-scrollbar flex gap-1 overflow-x-auto px-2 sm:px-4 lg:gap-2 lg:px-6">
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <a
              key={t.id}
              href={`#${t.id}`}
              data-tab={t.id}
              aria-current={on ? "location" : undefined}
              onClick={() => setActive(t.id)}
              className={`relative shrink-0 items-center px-3 py-3.5 text-[15px] transition-colors ${t.desktopOnly ? "hidden lg:flex" : "flex"} ${
                on ? "font-medium text-ink" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
              <span aria-hidden className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-ink transition-opacity ${on ? "opacity-100" : "opacity-0"}`} />
            </a>
          );
        })}
      </div>
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent transition-opacity ${moreRight ? "opacity-100" : "opacity-0"}`}
      />
    </nav>
  );
}
