"use client";

import Script from "next/script";
import { useRef, useState } from "react";
import { maskMobile, toMobile } from "@/lib/mobile";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// Passwordless: mobile number or email → 6-digit code → signed in. Nothing to remember, nothing to
// leak. One field takes either; numbers only where the host's PMS can send SMS.
export function SignInForm({ phoneSignIn = false, onSignedIn }: { phoneSignIn?: boolean; onSignedIn: () => void }) {
  const [step, setStep] = useState<"login" | "code">("login");
  const [who, setWho] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [testModeCode, setTestModeCode] = useState<string | null>(null);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  const method = phoneSignIn && who.trim() && !/[@a-z]/i.test(who) ? "phone" : "email";
  const email = who.trim();
  const login = method === "phone" ? { mobile: toMobile(who) ?? "" } : { email };
  const ready = method === "phone" ? toMobile(who) !== null : /^\S+@\S+\.\S+$/.test(email);

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
    if (!ready) {
      setError(method === "phone" ? "Enter a valid 10-digit mobile number." : phoneSignIn ? "Enter a valid mobile number or email address." : "Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError(null);
    const website = (document.getElementById("website-si") as HTMLInputElement | null)?.value ?? "";
    const res = await fetch("/api/auth/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...login, website, turnstileToken: token }),
    }).catch(() => null);
    setBusy(false);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (res?.status === 202) {
      setTestModeCode(typeof body.testModeCode === "string" ? body.testModeCode : null);
      setStep("code");
    } else if (res?.status === 429) setError("Too many attempts. Please wait a few minutes.");
    else if (res?.status === 400) setError(method === "phone" ? "Enter a valid 10-digit mobile number." : "Enter a valid email address.");
    else if (res?.status === 422 && typeof body.message === "string") setError(body.message);
    else setError(method === "phone" ? "We couldn't send the text message just now. Please try again." : "We couldn't send a code just now. Please try again.");
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
      body: JSON.stringify({ ...login, code }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      onSignedIn();
      return;
    }
    setError(res?.status === 429 ? "Too many attempts. Please request a new code later." : "That code is invalid or has expired.");
  }

  function back() {
    setStep("login");
    setCode("");
    setError(null);
  }

  const input = "focus-own w-full rounded-xl border border-field bg-white px-4 text-base outline-none placeholder:text-ink-soft focus:border-ink focus:ring-1 focus:ring-ink";
  const button = "min-h-12 w-full rounded-xl bg-brand px-6 py-3 font-medium text-white transition hover:brightness-110 disabled:opacity-50";
  const link = "min-h-11 underline underline-offset-4";

  if (step === "code") {
    const sentTo = method === "phone" ? maskMobile(toMobile(who) ?? "") : email;
    return (
      <form onSubmit={verify} className="space-y-4">
        <p className="text-ink-soft">
          {method === "phone" ? (
            <>We’ve sent a 6-digit code by SMS to <span className="text-ink">{sentTo}</span>. It expires in 10 minutes.</>
          ) : (
            <>If <span className="text-ink">{sentTo}</span> can be used here, a 6-digit code is on its way. It expires in 10 minutes.</>
          )}
        </p>
        {testModeCode && (
          <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Test mode:</strong> {method === "phone" ? "text messages" : "emails"} aren’t sent yet. Your code is{" "}
            <span className="font-mono text-base tracking-widest">{testModeCode}</span>
          </p>
        )}
        <label className="block">
          <span className="sr-only">6-digit code</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            className={`${input} min-h-15 text-center font-mono text-2xl tracking-[0.5em]`}
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy || code.length !== 6} className={button}>
          {busy ? "Checking…" : "Continue"}
        </button>
        <div className="flex justify-between text-sm">
          <button type="button" onClick={back} className={link}>
            {method === "phone" ? "Change number" : "Use a different email"}
          </button>
          <button type="button" onClick={() => sendCode()} disabled={busy} className={link}>
            Resend code
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} noValidate className="space-y-4">
      {TURNSTILE_SITE_KEY && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderTurnstile} />
      )}
      <label className="block">
        <span className="sr-only">{phoneSignIn ? "Phone number or email" : "Email"}</span>
        <input
          autoFocus
          type="text"
          inputMode={phoneSignIn ? "text" : "email"}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={who}
          onChange={(e) => {
            setWho(e.target.value);
            setError(null);
          }}
          placeholder={phoneSignIn ? "Phone number or email" : "Email"}
          aria-invalid={Boolean(error)}
          aria-describedby="signin-error"
          className={`${input} min-h-15`}
        />
      </label>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <input id="website-si" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div ref={widget} />
      <p id="signin-error" role="alert" className="text-sm text-red-700 empty:hidden">
        {error}
      </p>
      <button type="submit" disabled={busy || !who.trim() || (Boolean(TURNSTILE_SITE_KEY) && !token)} className={button}>
        {busy ? "Sending…" : "Continue"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        We’ll send a one-time code. No password needed. Use the {phoneSignIn ? "number or email" : "email"} you booked with to see your trips.
      </p>
    </form>
  );
}
