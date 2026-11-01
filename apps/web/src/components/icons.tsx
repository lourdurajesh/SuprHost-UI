// Inline stroke icons (24×24, currentColor). No icon library, so no bundle cost beyond what's used.

const paths: Record<string, string> = {
  wifi: "M2 8.8a15 15 0 0 1 20 0M5 12.6a10 10 0 0 1 14 0M8.5 16.3a5 5 0 0 1 7 0M12 20h.01",
  snow: "M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1 19.1 4.9M9 3l3 3 3-3M9 21l3-3 3 3",
  kitchen: "M4 3v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M6 13v8M18 3c-2 0-3 2-3 5s1 4 3 4v9",
  car: "M5 17h14M6 17v2M18 17v2M3 13l2-6h14l2 6v4H3zM7 13h.01M17 13h.01",
  leaf: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10ZM2 21c0-3 1.9-5.4 5.1-6",
  water: "M12 2.7c3.3 4 6 7.4 6 10.8a6 6 0 0 1-12 0c0-3.4 2.7-6.8 6-10.8Z",
  bolt: "M13 2 3 14h9l-1 8 10-12h-9z",
  coffee: "M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 2v2M10 2v2M14 2v2",
  shower: "M4 4l2.5 2.5M13.5 6.5a4.95 4.95 0 0 0-7 7M8 15h.01M11 18h.01M14 21h.01M5 18h.01M8 21h.01M17 6.5 21 2.5",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  bed: "M2 20V8M2 14h20v6M22 20v-5a3 3 0 0 0-3-3h-8v2M6 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  bath: "M9 6 6.5 3.5a1.5 1.5 0 0 0-2.1 0L3.5 4.4A1.5 1.5 0 0 0 3 5.5V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5H2M7 19v2M17 19v2",
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  shield: "M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10ZM9 12l2 2 4-4",
  chat: "M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z",
  wallet: "M20 7H5a2 2 0 0 1 0-4h13v4M3 5v14a2 2 0 0 0 2 2h15V7M16 14h.01",
  star: "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z",
  pin: "M12 22s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  check: "M20 6 9 17l-5-5",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  washer: "M3 4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM7 6h.01M11 6h.01M12 19a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  key: "m21 2-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8Zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  arrowRight: "M5 12h14M13 5l7 7-7 7",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM22 6l-10 7L2 6",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  close: "M18 6 6 18M6 6l12 12",
  upi: "M7 3 4 21M14 3l-6 18M17 7l3 5-3 5",
  card: "M2 5h20v14H2zM2 10h20M6 15h4",
  bank: "M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M2 10 12 3l10 7z",
  heart: "M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2",
};

export type IconName = keyof typeof paths;

export function Icon({ name, className = "h-5 w-5", strokeWidth = 1.6 }: { name: string; className?: string; strokeWidth?: number }) {
  const d = paths[name] ?? paths.check;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={d} />
    </svg>
  );
}

/** Best-effort icon for an amenity label coming from the PMS. */
export function amenityIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("wi-fi") || l.includes("wifi")) return "wifi";
  if (l.includes("air")) return "snow";
  if (l.includes("kitchen")) return "kitchen";
  if (l.includes("parking")) return "car";
  if (l.includes("garden") || l.includes("courtyard")) return "leaf";
  if (l.includes("shower")) return "shower";
  if (l.includes("hot water")) return "water";
  if (l.includes("power")) return "bolt";
  if (l.includes("breakfast")) return "coffee";
  if (l.includes("wash")) return "washer";
  if (l.includes("caretaker")) return "key";
  return "check";
}
