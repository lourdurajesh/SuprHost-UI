"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// Passwordless: email → 6-digit code → signed in. Nothing to remember, nothing to leak.
export function SignInForm({ next = "/account" }: { next?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [testModeCode, setTestModeCode] = useState<string | null>(null);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  function renderTurnstile() {
    if (!TURNSTILE_SITE_KEY || !widget.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(widget.current, {
      sitekey: TURNSTILE_SITE_KEY,
      action: "signin",
      appearance: "interaction-only",
      callback: (t: string) => setToken(t),
      "expired-callback": () => setToken(null),
    });
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    const website = (document.getElementById("website-si") as HTMLInputElement | null)?.value ?? "";
    const res = await fetch("/api/auth/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, website, turnstileToken: token }),
    }).catch(() => null);
    setBusy(false);
    if (res?.status === 202) {
      const body = await res.json().catch(() => ({}));
      setTestModeCode(typeof body.testModeCode === "string" ? body.testModeCode : null);
      setStep("code");
    }
    else if (res?.status === 429) setError("Too many attempts. Please wait a few minutes.");
    else if (res?.status === 400) setError("Enter a valid email address.");
    else setError("We couldn't send a code just now. Please try again.");
    window.turnstile?.reset(widgetId.current ?? undefined);
    setToken(null);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      // Full navigation so the header's account menu picks up the new session.
      window.location.assign(next.startsWith("/") && !next.startsWith("//") ? next : "/account");
      return;
    }
    setError(res?.status === 429 ? "Too many attempts. Please request a new code later." : "That code is invalid or has expired.");
  }

  const input = "mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base outline-none focus:border-ink";
  const button = "w-full rounded-full bg-brand px-6 py-4 text-white transition hover:brightness-125 disabled:opacity-50";

  return step === "email" ? (
    <form onSubmit={sendCode} className="space-y-5">
      {TURNSTILE_SITE_KEY && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderTurnstile} />
      )}
      <label className="block">
        <span className="text-sm">Email</span>
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} />
      </label>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <input id="website-si" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div ref={widget} />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={busy || !email || (Boolean(TURNSTILE_SITE_KEY) && !token)} className={button}>
        {busy ? "Sending…" : "Email me a sign-in code"}
      </button>
      <p className="text-center text-xs text-ink-soft">Use the email you booked with to see your trips.</p>
    </form>
  ) : (
    <form onSubmit={verify} className="space-y-5">
      <p className="text-ink-soft">
        If <span className="text-ink">{email}</span> can be used here, a 6-digit code is on its way. It expires in 10 minutes.
      </p>
      {testModeCode && (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Test mode:</strong> emails aren’t sent yet. Your code is{" "}
          <span className="font-mono text-base tracking-widest">{testModeCode}</span>
        </p>
      )}
      <label className="block">
        <span className="text-sm">Code</span>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className={`${input} text-center font-mono text-2xl tracking-[0.5em]`}
        />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={busy || code.length !== 6} className={button}>
        {busy ? "Checking…" : "Sign in"}
      </button>
      <div className="flex justify-between text-sm">
        <button type="button" onClick={() => { setStep("email"); setCode(""); setError(null); router.refresh(); }} className="underline underline-offset-4">
          Use a different email
        </button>
        <button type="button" onClick={() => sendCode()} disabled={busy} className="underline underline-offset-4">
          Resend code
        </button>
      </div>
    </form>
  );
}
