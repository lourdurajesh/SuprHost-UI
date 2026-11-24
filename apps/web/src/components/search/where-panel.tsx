"use client";

import { plural } from "@/lib/text";
import { useRef } from "react";
import { Icon } from "../icons";

export interface Place {
  value: string;
  count: number;
}

/** Match highlighting: the part of a name the guest has typed is shown in bold. */
function Highlight({ text, match }: { text: string; match: string }) {
  const i = match ? text.toLowerCase().indexOf(match.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <b className="font-medium">{text.slice(i, i + match.length)}</b>
      {text.slice(i + match.length)}
    </>
  );
}

/** Places to stay, as a typeahead list: Anywhere, then each town with its number of homes. */
export function WherePanel({ places, typed, selected, onPick }: { places: Place[]; typed: string; selected?: string; onPick: (city: string | undefined) => void }) {
  const list = useRef<HTMLUListElement>(null);
  const q = typed.trim().toLowerCase();
  const shown = places.filter((p) => !q || p.value.toLowerCase().includes(q));
  const total = places.reduce((n, p) => n + p.count, 0);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(list.current?.querySelectorAll<HTMLElement>("button") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[Math.min(items.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
  }

  const tile = "grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sand-deep text-ink";
  return (
    <div>
      <p className="px-2 pb-2 text-sm text-ink-soft">{q ? "Matching places" : "Choose a place"}</p>
      <ul ref={list} onKeyDown={onKeyDown} className="max-h-[22rem] space-y-0.5 overflow-y-auto">
        {!q && (
          <li>
            <button type="button" onClick={() => onPick(undefined)} className={`flex w-full items-center gap-4 rounded-xl p-2 text-left hover:bg-sand-deep ${!selected ? "bg-sand-deep" : ""}`}>
              <span className={tile}>
                <Icon name="search" />
              </span>
              <span>
                <span className="block">Anywhere</span>
                <span className="block text-sm text-ink-soft">{total} homes</span>
              </span>
            </button>
          </li>
        )}
        {shown.map((p) => (
          <li key={p.value}>
            <button type="button" onClick={() => onPick(p.value)} className={`flex w-full items-center gap-4 rounded-xl p-2 text-left hover:bg-sand-deep ${selected === p.value ? "bg-sand-deep" : ""}`}>
              <span className={tile}>
                <Icon name="pin" />
              </span>
              <span>
                <span className="block">
                  <Highlight text={p.value} match={q} />
                </span>
                <span className="block text-sm text-ink-soft">
                  {plural(p.count, "home")}
                </span>
              </span>
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="p-3 text-ink-soft">We don’t have a home there yet. Try another place.</li>}
      </ul>
    </div>
  );
}
