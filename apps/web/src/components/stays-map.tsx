"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  href?: string;
  title?: string;
}

interface Props {
  pins: MapPin[];
  activeId?: string | null;
  onPinHover?: (id: string | null) => void;
  className?: string;
  /** Single-listing maps show an approximate-area circle instead of an exact pin. */
  approximate?: boolean;
  zoom?: number;
  /** Open on this area ([south, west, north, east]) instead of fitting the pins. */
  initialBounds?: [number, number, number, number] | null;
  /** Called after the guest pans or zooms (not after the map's own fitting), with [south, west, north, east]. */
  onMoveEnd?: (bounds: [number, number, number, number]) => void;
}

const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const STYLE_ID = process.env.NEXT_PUBLIC_MAPTILER_STYLE ?? "streets-v2";

// MapTiler in production. Without a key (local development only) fall back to OpenStreetMap's
// raster tiles, which are fine for testing but not for production traffic.
function mapStyle() {
  if (KEY) return `https://api.maptiler.com/maps/${STYLE_ID}/style.json?key=${KEY}`;
  return {
    version: 8 as const,
    sources: {
      osm: {
        type: "raster" as const,
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
  };
}

// MapLibre (~220 KB gzip) is only downloaded when the map scrolls into view.
export function StaysMap({ pins, activeId, onPinHover, className = "", approximate = false, zoom = 12, initialBounds = null, onMoveEnd }: Props) {
  // The latest handlers, without rebuilding the map or its pins when they change.
  const moveEnd = useRef(onMoveEnd);
  const pinHover = useRef(onPinHover);
  useEffect(() => {
    moveEnd.current = onMoveEnd;
    pinHover.current = onPinHover;
  }, [onMoveEnd, onPinHover]);
  const keepView = initialBounds !== null;
  const el = useRef<HTMLDivElement>(null);
  const markers = useRef(new Map<string, { marker: Marker; node: HTMLElement }>());
  const [visible, setVisible] = useState(false);
  // The map that is on screen now: a new object each time one is made, so its pins are drawn on it.
  const [made, setMade] = useState<{ map: MapLibreMap; lib: typeof import("maplibre-gl") } | null>(null);
  const [failed, setFailed] = useState(false);
  // Pins are compared by value, so a new but equal list (a re-render) changes nothing.
  const pinsKey = JSON.stringify(pins);

  useEffect(() => {
    if (!el.current) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(true), { rootMargin: "200px" });
    io.observe(el.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !el.current) return;
    let cancelled = false;
    let shown: MapLibreMap | null = null;
    const container = el.current;
    const registry = markers.current;
    import("maplibre-gl")
      .then((maplibregl) => {
        if (cancelled) return;
        // Its background worker, served from this site like the rest (the default looks next to the script).
        maplibregl.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
        const m = new maplibregl.Map({
          container,
          style: mapStyle(),
          center: pins[0] ? [pins[0].lng, pins[0].lat] : [78.96, 22.59], // the middle of India, until pins or bounds place it
          zoom,
          attributionControl: false,
          cooperativeGestures: true,
        });
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        // The map credit, on the side the chat button never covers.
        m.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
        shown = m;
        setMade({ map: m, lib: maplibregl });

        if (approximate && pins[0]) {
          // Map layers take real colours, not CSS variables.
          const tint = getComputedStyle(container).getPropertyValue("--brand").trim() || "#222222";
          m.on("load", () => {
            m.addSource("area", { type: "geojson", data: { type: "Point", coordinates: [pins[0].lng, pins[0].lat] } });
            m.addLayer({
              id: "area",
              type: "circle",
              source: "area",
              paint: { "circle-radius": 60, "circle-color": tint, "circle-opacity": 0.15, "circle-stroke-color": tint, "circle-stroke-width": 1.5 },
            });
          });
          return;
        }

        if (initialBounds) {
          const [s, w, n, e] = initialBounds;
          m.fitBounds([[w, s], [e, n]], { padding: 0, duration: 0 });
        }
        // Only moves the guest makes count (they carry an originalEvent); fitting above doesn't.
        m.on("moveend", (ev) => {
          if (!("originalEvent" in ev) || !ev.originalEvent) return;
          const b = m.getBounds();
          const r = (v: number) => Math.round(v * 10_000) / 10_000;
          moveEnd.current?.([r(b.getSouth()), r(b.getWest()), r(b.getNorth()), r(b.getEast())]);
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      registry.clear();
      shown?.remove();
      setMade(null);
    };
    // The map is made once; pins and highlights change it in place below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Pins for the homes shown. A map the guest has positioned (initialBounds) keeps its place.
  useEffect(() => {
    if (!made || approximate) return;
    const { map: m, lib: maplibregl } = made;
    const list = JSON.parse(pinsKey) as MapPin[];
    const registry = markers.current;
    registry.forEach(({ marker }) => marker.remove());
    registry.clear();
    for (const p of list) {
      const node = document.createElement(p.href ? "a" : "div");
      if (p.href) (node as HTMLAnchorElement).href = p.href;
      node.className =
        "block rounded-full bg-white px-3 py-1.5 text-sm font-medium text-ink shadow-[0_2px_10px_rgba(0,0,0,0.18)] ring-1 ring-black/5 transition-transform hover:scale-110";
      node.textContent = p.label;
      if (p.title) node.title = p.title;
      if (p.title && p.href) node.setAttribute("aria-label", `${p.title}, ${p.label}`);
      node.addEventListener("mouseenter", () => pinHover.current?.(p.id));
      node.addEventListener("mouseleave", () => pinHover.current?.(null));
      registry.set(p.id, { marker: new maplibregl.Marker({ element: node }).setLngLat([p.lng, p.lat]).addTo(m), node });
    }
    if (list.length > 0 && !keepView) {
      const bounds = new maplibregl.LngLatBounds();
      list.forEach((p) => bounds.extend([p.lng, p.lat]));
      m.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 0 });
    }
  }, [made, pinsKey, approximate, keepView]);

  // Highlight the pin of the card under the pointer.
  useEffect(() => {
    markers.current.forEach(({ node }, id) => {
      const on = id === activeId;
      node.style.background = on ? "var(--ink)" : "";
      node.style.color = on ? "#fff" : "";
      node.style.zIndex = on ? "2" : "";
    });
  }, [activeId, pinsKey, made]);

  return (
    <div ref={el} role="region" aria-label={approximate ? "Map of the area" : "Map of stays"} className={`relative overflow-hidden bg-sand-deep ${className}`}>
      {failed && <p className="absolute inset-0 flex items-center justify-center text-sm text-ink-soft">Map unavailable</p>}
    </div>
  );
}
