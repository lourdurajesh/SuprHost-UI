"use client";

import { useEffect, useState } from "react";
import { contrast } from "@/lib/colors";
import { customPalette, PALETTES, paletteVars, type Palette } from "@/lib/palettes";
import { Icon } from "../icons";

const KEY = "sh_palette_preview";
type Preview = { id: string; brand?: string; accent?: string };

const toPalette = (p: Preview): Palette | null =>
  p.id === "custom" && p.brand && p.accent ? customPalette(p.brand, p.accent) : (PALETTES.find((x) => x.id === p.id) ?? null);

function paint(p: Palette | null) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(paletteVars(p ?? PALETTES[0]))) {
    if (p) root.style.setProperty(k, v);
    else root.style.removeProperty(k);
  }
}

/**
 * Development only: try the palettes on the real pages and lock one in. A preview lives in this
 * browser (it survives page changes and reloads); "Lock in" writes it to src/lib/palette.lock.json
 * for this site, which is what everyone gets. Never rendered in a production build.
 */
export function PaletteLab({ locked }: { locked: string | null }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [custom, setCustom] = useState({ brand: "#d02f4c", accent: "#b3273f" });
  const [note, setNote] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Preview | null;
      const p = saved && toPalette(saved);
      if (saved && p) {
        paint(p);
        const t = setTimeout(() => setPreview(saved), 0);
        return () => clearTimeout(t);
      }
    } catch {
      // Storage blocked: previews just don't survive a reload.
    }
  }, []);

  function tryOut(p: Preview | null) {
    setPreview(p);
    setNote("");
    paint(p && toPalette(p));
    try {
      if (p) localStorage.setItem(KEY, JSON.stringify(p));
      else localStorage.removeItem(KEY);
    } catch {}
  }

  async function lockIn() {
    if (!preview) return;
    setNote("Saving…");
    const r = await fetch("/api/dev/palette", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preview) }).catch(() => null);
    if (!r?.ok) return setNote("Couldn’t save it.");
    try {
      localStorage.removeItem(KEY);
    } catch {}
    // The file is part of the build: reload to see the site as everyone will.
    setTimeout(() => window.location.reload(), 900);
    setNote("Locked in. Reloading…");
  }

  const current = preview?.id ?? locked;
  const shown = preview && toPalette(preview);
  return (
    <div className="fixed bottom-20 left-4 z-[60] text-sm print:hidden">
      {open && (
        <div role="dialog" aria-label="Palette picker" className="mb-3 max-h-[70dvh] w-72 overflow-y-auto rounded-2xl bg-white p-4 text-ink shadow-2xl ring-1 ring-line">
          <div className="flex items-center justify-between">
            <p className="font-medium">Colour palette</p>
            <span className="rounded-full bg-sand-deep px-2 py-0.5 text-xs text-ink-soft">Development</span>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {PALETTES.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={current === p.id}
                  onClick={() => tryOut({ id: p.id })}
                  className={`focus-own w-full rounded-xl p-2 text-left ring-1 focus-visible:ring-2 focus-visible:ring-ink ${current === p.id ? "ring-2 ring-ink" : "ring-line hover:ring-ink-soft"}`}
                >
                  <span className="flex h-7 overflow-hidden rounded-lg" aria-hidden>
                    {[p.brand, p.brand2, p.accent, p.ink, p.sandDeep].map((c, i) => (
                      <span key={i} className="flex-1" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="mt-1.5 flex items-center justify-between">
                    {p.name}
                    {locked === p.id && <Icon name="lock" className="h-3.5 w-3.5" />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <fieldset className="mt-3 rounded-xl p-2 ring-1 ring-line">
            <legend className="px-1 text-xs text-ink-soft">Your own{locked === "custom" ? " (locked)" : ""}</legend>
            <div className="flex items-center gap-3">
              {(["brand", "accent"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 capitalize">
                  <input
                    type="color"
                    value={custom[k]}
                    onChange={(e) => {
                      const next = { ...custom, [k]: e.target.value };
                      setCustom(next);
                      tryOut({ id: "custom", ...next });
                    }}
                    className="h-8 w-8 cursor-pointer rounded"
                  />
                  {k}
                </label>
              ))}
            </div>
          </fieldset>
          {shown && (
            <p className="mt-2 text-xs text-ink-soft">
              White on brand {contrast("#ffffff", shown.brand).toFixed(1)}:1 · text on white {contrast("#ffffff", shown.ink).toFixed(1)}:1 (4.5 or more is readable)
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={lockIn} disabled={!preview} className="min-h-10 flex-1 rounded-xl bg-brand px-3 text-white disabled:opacity-40">
              Lock in
            </button>
            <button type="button" onClick={() => tryOut(null)} disabled={!preview} className="min-h-10 rounded-xl px-3 ring-1 ring-line disabled:opacity-40">
              Undo
            </button>
          </div>
          <p role="status" className="mt-2 min-h-4 text-xs text-ink-soft">
            {note || (preview ? "Previewing in this browser only." : "Pick one to try it on every page.")}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Palette picker (development)"
        className="flex h-10 items-center gap-2 rounded-full bg-white pl-2 pr-3 text-xs shadow-lg ring-1 ring-line"
      >
        <span aria-hidden className="h-6 w-6 rounded-full" style={{ background: "conic-gradient(var(--brand) 0 33%, var(--accent) 0 66%, var(--ink) 0)" }} />
        Colours
      </button>
    </div>
  );
}
