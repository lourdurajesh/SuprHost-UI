import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Listing photos come from the public image CDN (never the private ID-document bucket).
const imageOrigin = process.env.IMAGE_CDN_ORIGIN?.replace(/\/+$/, "");
const turnstile = "https://challenges.cloudflare.com";
// Map tiles: MapTiler when a key is configured; OpenStreetMap raster tiles only as the
// keyless fallback for local development (see components/stays-map.tsx).
const mapHosts = process.env.NEXT_PUBLIC_MAPTILER_KEY ? "https://api.maptiler.com" : "https://tile.openstreetmap.org";

// Static CSP so pages stay prerendered and CDN-cacheable. Nonces would force every page to render
// per request (no static shell, no edge cache), which breaks the speed budget. Inline scripts are
// limited to Next.js' own; there is no user-supplied HTML and no third-party script host except
// Turnstile. See docs/ARCHITECTURE.md §4.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${turnstile}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${mapHosts}${imageOrigin ? ` ${imageOrigin}` : ""}`,
  "font-src 'self'",
  `connect-src 'self' ${turnstile} ${mapHosts}`,
  `frame-src ${turnstile}`,
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  // MapLibre renders tiles in a Web Worker created from a blob URL.
  "worker-src 'self' blob:",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: imageOrigin ? [new URL(`${imageOrigin}/**`)] : [],
    minimumCacheTTL: 2_678_400,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
