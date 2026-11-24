"use client";

import { useEffect, useState } from "react";
import { contrast } from "@/lib/colors";
import { customPalette, PALETTES, paletteVars, type Palette } from "@/lib/palettes";
import { Icon } from "../icons";
import { buttonClass, fieldClass } from "../ui/button";

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
 * Development only, on its own internal page (/dev/theme): try the palettes and lock one in. A preview
 * colours this page alone; "Lock in" writes it to src/lib/palette.lock.json for this site, which is what
 * everyone gets. Never rendered in a production build.
 */
export function PaletteLab({ siteName, locked }: { siteName: string; locked: string | null }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [custom, setCustom] = useState({ brand: "#d02f4c", accent: "#b3273f" });
  const [note, setNote] = useState("");

  // Leaving the page drops the preview.
  useEffect(() => () => paint(null), []);

  function tryOut(p: Preview | null) {
    setPreview(p);
    setNote("");
    paint(p && toPalette(p));
  }

  async function lockIn() {
    if (!preview) return;
    setNote("Saving…");
    const r = await fetch("/api/dev/palette", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preview) }).catch(() => null);
    if (!r?.ok) return setNote("Couldn’t save it.");
    // The file is part of the build: reload to see the site as everyone will.
    setTimeout(() => window.location.reload(), 900);
    setNote("Locked in. Reloading…");
  }

  const current = preview?.id ?? locked;
  const shown = preview && toPalette(preview);
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[22rem_1fr]">
      <div>
        <h1 className="text-h2">Theme for {siteName}</h1>
        <p className="mt-2 text-sm text-ink-soft">Internal. Guests never see this page.</p>
        <div className="mt-5">
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
            <button type="button" onClick={lockIn} disabled={!preview} className={`${buttonClass("primary", "sm")} flex-1`}>
              Lock in
            </button>
            <button type="button" onClick={() => tryOut(null)} disabled={!preview} className={buttonClass("outline", "sm")}>
              Undo
            </button>
          </div>
          <p role="status" className="mt-2 min-h-4 text-xs text-ink-soft">
            {note || (preview ? "Previewing on this page only." : "Pick one to try it here.")}
          </p>
        </div>
      </div>
      <section aria-label="Preview" className="space-y-6 rounded-2xl border border-line p-6">
        <h2 className="text-h1">Feel the comfort</h2>
        <p className="text-ink-soft">Secondary text, as under a home&rsquo;s name.</p>
        <p className="font-medium text-accent">Accent text: 4 Dec – 6 Dec</p>
        <div className="flex flex-wrap gap-3">
          <span className={buttonClass()}>Reserve</span>
          <span className={buttonClass("dark")}>Next</span>
          <span className={buttonClass("outline")}>Message the host</span>
          <span className={buttonClass("soft")}>Show all</span>
        </div>
        <label className="block text-sm">
          A field
          <input className={`${fieldClass} mt-1.5`} placeholder="you@example.com" />
        </label>
        <p className="rounded-2xl bg-sand-deep p-5">A soft panel</p>
        <p className="rounded-2xl bg-brand p-5 text-white">A brand panel</p>
      </section>
    </div>
  );
}
