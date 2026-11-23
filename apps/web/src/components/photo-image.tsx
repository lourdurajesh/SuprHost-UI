"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * next/image that never shows the browser's broken-image icon: if the file fails to load (a
 * deleted upload, a CDN blip) the warm placeholder gradient is shown instead. Client component only
 * because it needs the browser. The server-rendered <img> can fail before React hydrates and
 * misses its onError, so the effect also checks images that already finished loading broken.
 */
export function PhotoImage(props: ImageProps) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#d9c6a5] via-[#c7b08a] to-[#8f7a5a]" />;
  }
  // eslint-disable-next-line jsx-a11y/alt-text -- alt is part of the props passed in
  return <Image {...props} ref={ref} onError={() => setFailed(true)} />;
}
