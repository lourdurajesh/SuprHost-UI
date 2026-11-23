"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * next/image with two guest-facing behaviours:
 * - While the file loads, a soft pulse shows instead of an empty block.
 * - If the file fails (a deleted upload, a CDN blip) the warm placeholder gradient is shown, never
 *   the browser's broken-image icon.
 * Client component only because it needs the browser. The server-rendered <img> can finish (or
 * fail) before React hydrates and miss its events, so the effect also checks images that are
 * already complete.
 */
export function PhotoImage(props: ImageProps) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.complete) setState(el.naturalWidth === 0 ? "failed" : "loaded");
  }, []);

  if (state === "failed") {
    return <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#d9c6a5] via-[#c7b08a] to-[#8f7a5a]" />;
  }
  return (
    <>
      {state === "loading" && <div aria-hidden className="absolute inset-0 animate-pulse bg-white/40" />}
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is part of the props passed in */}
      <Image {...props} ref={ref} onLoad={() => setState("loaded")} onError={() => setState("failed")} />
    </>
  );
}
