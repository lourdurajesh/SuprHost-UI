"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapPin {
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
  const moveEnd = useRef(onMoveEnd);
  useEffect(() => {
    moveEnd.current = onMoveEnd;
  }, [onMoveEnd]);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; node: HTMLElement }>());
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!el.current) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(true), { rootMargin: "200px" });
    io.observe(el.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !el.current || map.current) return;
    let cancelled = false;
    const container = el.current;
    const registry = markers.current;
    import("maplibre-gl")
      .then(({ default: maplibregl }) => {
        if (cancelled) return;
        const m = new maplibregl.Map({
          container,
          style: mapStyle(),
          center: pins[0] ? [pins[0].lng, pins[0].lat] : [76.65, 12.3],
          zoom,
          attributionControl: { compact: true },
          cooperativeGestures: true,
        });
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        map.current = m;

        if (approximate && pins[0]) {
          m.on("load", () => {
            m.addSource("area", { type: "geojson", data: { type: "Point", coordinates: [pins[0].lng, pins[0].lat] } });
            m.addLayer({
              id: "area",
              type: "circle",
              source: "area",
              paint: { "circle-radius": 60, "circle-color": "#3d3a3a", "circle-opacity": 0.15, "circle-stroke-color": "#3d3a3a", "circle-stroke-width": 1.5 },
            });
          });
          return;
        }

        for (const p of pins) {
          const node = document.createElement(p.href ? "a" : "div");
          if (p.href) (node as HTMLAnchorElement).href = p.href;
          node.className =
            "block rounded-full bg-white px-3 py-1.5 text-sm font-medium text-[#3d3a3a] shadow-[0_2px_10px_rgba(0,0,0,0.18)] ring-1 ring-black/5 transition-transform hover:scale-110";
          node.textContent = p.label;
          if (p.title) node.title = p.title;
          if (p.title && p.href) node.setAttribute("aria-label", `${p.title}, ${p.label}`);
          node.addEventListener("mouseenter", () => onPinHover?.(p.id));
          node.addEventListener("mouseleave", () => onPinHover?.(null));
          const marker = new maplibregl.Marker({ element: node }).setLngLat([p.lng, p.lat]).addTo(m);
          registry.set(p.id, { marker, node });
        }
        if (initialBounds) {
          const [s, w, n, e] = initialBounds;
          m.fitBounds([[w, s], [e, n]], { padding: 0, duration: 0 });
        } else if (pins.length > 1) {
          const bounds = new maplibregl.LngLatBounds();
          pins.forEach((p) => bounds.extend([p.lng, p.lat]));
          m.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 0 });
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
      registry.forEach(({ marker }) => marker.remove());
      registry.clear();
      map.current?.remove();
      map.current = null;
    };
    // Pins are rebuilt by remounting (key on the parent) when results change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Highlight the pin of the card under the pointer.
  useEffect(() => {
    markers.current.forEach(({ node }, id) => {
      const on = id === activeId;
      node.style.background = on ? "#3d3a3a" : "";
      node.style.color = on ? "#fff" : "";
      node.style.zIndex = on ? "2" : "";
    });
  }, [activeId]);

  return (
    <div ref={el} role="region" aria-label="Map" className={`relative overflow-hidden bg-sand-deep ${className}`}>
      {failed && <p className="absolute inset-0 flex items-center justify-center text-sm text-ink-soft">Map unavailable</p>}
    </div>
  );
}
