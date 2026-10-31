// Brand colours come from the site owner, so the theme can't assume they are readable.
// `readable` darkens a colour (same hue) until it reaches the WCAG contrast ratio against a
// background: brand fills carry white text, accent is used for small text on light surfaces.

const HEX = /^#[0-9a-f]{6}$/i;

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(channels(a)), luminance(channels(b))];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Returns `hex` (or `fallback` if it isn't a plain #rrggbb) darkened until it meets `ratio` against `against`. */
export function readable(hex: string, fallback: string, against: string, ratio = 4.5): string {
  const base = HEX.test(hex) ? hex.toLowerCase() : fallback;
  const rgb = channels(base);
  for (let step = 0; step <= 20; step++) {
    const k = 1 - step * 0.05;
    const candidate = "#" + rgb.map((v) => Math.round(v * k).toString(16).padStart(2, "0")).join("");
    if (contrast(candidate, against) >= ratio) return candidate;
  }
  return "#000000";
}
