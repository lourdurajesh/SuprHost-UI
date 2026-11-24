"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export interface BotCheck {
  on: boolean;
  /** There is a token, or no check is configured. */
  ready: boolean;
  /** Take the token and ask for a fresh one: each is good for one request. */
  take: () => string | null;
  /** For TurnstileWidget. */
  setToken: (token: string | null) => void;
  round: number;
}

/** Cloudflare's bot check, for anything that sends a code. Render <TurnstileWidget> where a challenge may appear. */
export function useTurnstile(enabled = true): BotCheck {
  const on = enabled && Boolean(SITE_KEY);
  const [token, setToken] = useState<string | null>(null);
  const [round, setRound] = useState(0);

  function take() {
    setToken(null);
    setRound((r) => r + 1);
    return token;
  }

  return { on, ready: !on || token !== null, take, setToken, round };
}

export function TurnstileWidget({ check }: { check: BotCheck }) {
  return check.on ? <Widget setToken={check.setToken} round={check.round} /> : null;
}

function Widget({ setToken, round }: Pick<BotCheck, "setToken" | "round">) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (id.current) window.turnstile?.remove(id.current);
      id.current = null;
      setToken(null);
    },
    [setToken],
  );

  useEffect(() => {
    if (round > 0 && id.current) window.turnstile?.reset(id.current);
  }, [round]);

  // Runs once the script has loaded, and again for each later mount.
  function attach() {
    if (!box.current || !window.turnstile || id.current) return;
    id.current = window.turnstile.render(box.current, {
      sitekey: SITE_KEY,
      action: "signin",
      appearance: "interaction-only",
      callback: (t: string) => setToken(t),
      "expired-callback": () => setToken(null),
      "error-callback": () => setToken(null),
    });
  }

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={attach} />
      <div ref={box} />
    </>
  );
}
