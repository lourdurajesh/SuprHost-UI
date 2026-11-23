"use client";

import { useEffect } from "react";

/**
 * Reports one funnel step to our own server (see api/e). No cookie, no third-party script; skipped
 * when the browser sends Global Privacy Control or Do Not Track. Fire-and-forget: a failure is
 * invisible to the guest.
 */
export function trackFunnel(step: "home" | "stay" | "quote" | "checkout", listing?: string) {
  try {
    const n = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (n.globalPrivacyControl || n.doNotTrack === "1") return;
    navigator.sendBeacon("/api/e", new Blob([JSON.stringify({ step, listing })], { type: "application/json" }));
  } catch {
    // Tracking must never break a page.
  }
}

/** Renders nothing; fires once when the page it sits on appears. */
export function Track({ step, listing }: { step: "home" | "stay" | "quote" | "checkout"; listing?: string }) {
  useEffect(() => trackFunnel(step, listing), [step, listing]);
  return null;
}
