"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/dates";

type Tab = { id: string; label: string };

// A bar of jump links that comes down once the photos have scrolled away, as the site header has by
// then. The section in view is underlined. When the booking card is out of view too, the bar also
// carries the price and the next step.
export function SectionTabs({ tabs, fromPrice, currency, addsGst }: { tabs: Tab[]; fromPrice: number; currency: string; addsGst?: boolean }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const [shown, setShown] = useState(false);
  const [cardAway, setCardAway] = useState(false);
  const row = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = tabs.map((t) => document.getElementById(t.id)).filter((e): e is HTMLElement => e !== null);
    const photos = sections[0];
    const card = document.getElementById("book");
    const onScroll = () => {
      setShown(Boolean(photos) && photos.getBoundingClientRect().bottom < 80);
      if (card) {
        const b = card.getBoundingClientRect();
        setCardAway(b.bottom < 160 || b.top > window.innerHeight);
      }
      // The active section is the last one whose top has passed the bar.
      let current = sections[0]?.id;
      for (const el of sections) if (el.getBoundingClientRect().top <= 130) current = el.id;
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
    const link = el?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!el || !link) return;
    el.scrollTo({ left: Math.max(0, link.offsetLeft - el.clientWidth / 2 + link.offsetWidth / 2), behavior: "smooth" });
  }, [active]);

  return (
    <nav
      aria-label="Sections"
      inert={!shown}
      className={`fixed inset-x-0 top-0 z-40 border-b border-line bg-white transition duration-200 print:hidden ${shown ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
    >
      <div className="mx-auto flex h-[72px] max-w-[1152px] items-stretch justify-between gap-6 px-4 sm:px-6">
        <div ref={row} className="no-scrollbar flex gap-6 overflow-x-auto">
          {tabs.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              data-tab={t.id}
              aria-current={t.id === active ? "location" : undefined}
              className={`relative flex shrink-0 items-center text-sm font-medium ${t.id === active ? "text-ink" : "text-ink-soft hover:text-ink"}`}
            >
              {t.label}
              <span aria-hidden className={`absolute inset-x-0 bottom-0 h-1 bg-ink transition-opacity ${t.id === active ? "opacity-100" : "opacity-0"}`} />
            </a>
          ))}
        </div>
        <div className={`hidden items-center gap-5 transition-opacity md:flex ${cardAway ? "opacity-100" : "pointer-events-none opacity-0"}`} inert={!cardAway}>
          <p className="text-right text-sm leading-tight">
            <span className="text-base font-medium">{formatMoney(fromPrice, currency)}</span> / night
            {addsGst && <span className="block text-ink-soft">+ GST</span>}
          </p>
          <a href="#book" className="inline-flex min-h-12 items-center rounded-xl bg-brand px-6 font-medium text-white">
            Check availability
          </a>
        </div>
      </div>
    </nav>
  );
}
