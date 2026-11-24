import { readable } from "./colors";
import locks from "./palette.lock.json";

/**
 * The site's colours. Every colour on the site comes from one palette: `brand` (buttons and other
 * fills, with white text), `brand2` (the far end of a button's gradient), `accent` (small coloured
 * text), and the neutrals. Pick one in development with the palette picker (components/dev/palette-lab),
 * which writes the choice to palette.lock.json; until one is locked, the PMS's two brand colours are used.
 */
export interface Palette {
  id: string;
  name: string;
  brand: string;
  brand2: string;
  accent: string;
  ink: string;
  inkSoft: string;
  sandDeep: string;
  line: string;
  field: string;
}

const NEUTRAL = { ink: "#222222", inkSoft: "#636363", sandDeep: "#f6f6f6", line: "#e2e2e2", field: "#8a8a8a" };

export const PALETTES: Palette[] = [
  { id: "coral", name: "Coral", brand: "#d02f4c", brand2: "#b81a5b", accent: "#b3273f", ...NEUTRAL },
  { id: "charcoal", name: "Charcoal", brand: "#3d3a3a", brand2: "#2a2828", accent: "#3f746a", ink: "#3d3a3a", inkSoft: "#6b6562", sandDeep: "#f5f3f0", line: "#e9e5e0", field: "#8f8985" },
  { id: "navy", name: "Navy and sky", brand: "#0a4174", brand2: "#15619f", accent: "#0f5c9c", ink: "#0f2438", inkSoft: "#536577", sandDeep: "#f0f6fb", line: "#d9e4ee", field: "#7b8da0" },
  { id: "teal", name: "Lagoon", brand: "#0f766e", brand2: "#0b5c70", accent: "#0f6f68", ink: "#132e2c", inkSoft: "#526b68", sandDeep: "#eff6f5", line: "#d6e4e2", field: "#768d8a" },
  { id: "terracotta", name: "Terracotta", brand: "#a8482a", brand2: "#8c3626", accent: "#9c4429", ink: "#2f2420", inkSoft: "#6b5b54", sandDeep: "#faf4ef", line: "#eadfd6", field: "#917f75" },
  { id: "forest", name: "Forest", brand: "#2f6b3f", brand2: "#1d5238", accent: "#2f6b3f", ink: "#1f2b22", inkSoft: "#57665b", sandDeep: "#f1f6f0", line: "#dbe5da", field: "#7c8c7f" },
  { id: "plum", name: "Plum", brand: "#7a2e6b", brand2: "#5c2270", accent: "#7a2e6b", ink: "#2b1f2b", inkSoft: "#675866", sandDeep: "#f8f3f8", line: "#e8dde7", field: "#8c7b8b" },
  { id: "indigo", name: "Indigo", brand: "#4338ca", brand2: "#5b21b6", accent: "#4338ca", ink: "#1e1b3a", inkSoft: "#5c5a75", sandDeep: "#f4f4fb", line: "#dfdff0", field: "#83819c" },
  { id: "bronze", name: "Bronze", brand: "#8a5a12", brand2: "#6e430e", accent: "#85560f", ink: "#2b2418", inkSoft: "#665d4c", sandDeep: "#faf6ec", line: "#ebe3d1", field: "#8f8672" },
];

/** A locked choice: a palette by id, or the host's own two colours. */
type PaletteLock = { id: string } | { id: "custom"; brand: string; accent: string };

export function customPalette(brand: string, accent: string): Palette {
  return {
    id: "custom",
    name: "Custom",
    // Darkened if needed, so white text on the fill and accent text on the soft ground stay at 4.5:1.
    brand: readable(brand, "#3d3a3a", "#ffffff"),
    brand2: readable(brand, "#3d3a3a", "#ffffff", 5.5),
    accent: readable(accent, "#3f746a", NEUTRAL.sandDeep),
    ...NEUTRAL,
  };
}

function paletteFrom(lock: PaletteLock | undefined): Palette | null {
  if (!lock) return null;
  if (lock.id === "custom" && "brand" in lock) return customPalette(lock.brand, lock.accent);
  return PALETTES.find((p) => p.id === lock.id) ?? null;
}

export const lockedPalette = (siteKey: string) => (locks as Record<string, PaletteLock>)[siteKey];

/** The palette for a site: the locked one, else one made from the colours set in the PMS. */
export function sitePalette(siteKey: string, pms: { primary: string; accent: string }): Palette {
  return paletteFrom(lockedPalette(siteKey)) ?? customPalette(pms.primary, pms.accent);
}

export const paletteVars = (p: Palette): Record<string, string> => ({
  "--brand": p.brand,
  "--brand-2": p.brand2,
  "--accent": p.accent,
  "--ink": p.ink,
  "--ink-soft": p.inkSoft,
  "--sand-deep": p.sandDeep,
  "--line": p.line,
  "--field": p.field,
});

/** Only plain hex values reach the stylesheet: palettes are our own, custom ones go through `readable`. */
export const paletteCss = (p: Palette) =>
  `:root{${Object.entries(paletteVars(p))
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`;
