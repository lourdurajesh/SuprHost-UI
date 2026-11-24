"use client";

import { useState } from "react";
import { requestCode, verifyCode } from "@/lib/auth-client";
import { maskMobile, toMobile } from "@/lib/mobile";
import { CodeInput, Honeypot, honeypotValue, TestModeCode } from "./sign-in-code";
import { TurnstileWidget, useTurnstile } from "./turnstile";
import { buttonClass, fieldClass, textButton } from "./ui/button";

const submit = `${buttonClass()} w-full`;

// Passwordless: mobile number or email → 6-digit code → signed in. Nothing to remember, nothing to
// leak. One field takes either; numbers only where the host's PMS can send SMS.
export function SignInForm({ phoneSignIn, onSignedIn }: { phoneSignIn: boolean; onSignedIn: () => void }) {
  const [step, setStep] = useState<"login" | "code">("login");
  const [who, setWho] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testModeCode, setTestModeCode] = useState<string | null>(null);
  const check = useTurnstile();

  const typed = who.trim();
  const byPhone = phoneSignIn && typed !== "" && !/[@a-z]/i.test(typed);
  const mobile = byPhone ? toMobile(typed) : null;
  const ready = byPhone ? mobile !== null : /^\S+@\S+\.\S+$/.test(typed);
  const login = byPhone ? { mobile: mobile ?? "" } : { email: typed };

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!ready) {
      return setError(byPhone ? "Enter a valid 10-digit mobile number." : phoneSignIn ? "Enter a valid mobile number or email address." : "Enter a valid email address.");
    }
    setBusy(true);
    setError(null);
    const sent = await requestCode(login, { website: honeypotValue("website-signin"), turnstileToken: check.take() });
    setBusy(false);
    if (!sent.sent) return setError(sent.message);
    setTestModeCode(sent.testModeCode);
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const problem = await verifyCode(login, code);
    if (!problem) return onSignedIn();
    setBusy(false);
    setError(problem);
  }

  return (
    <form onSubmit={step === "login" ? sendCode : verify} noValidate className="space-y-4">
      {step === "login" ? (
        <>
          <label className="block">
            <span className="sr-only">{phoneSignIn ? "Phone number or email" : "Email"}</span>
            <input
              data-autofocus
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
              className={`${fieldClass} min-h-15`}
            />
          </label>
          <Honeypot id="website-signin" />
          <p id="signin-error" role="alert" className="text-sm text-red-700 empty:hidden">
            {error}
          </p>
          <button type="submit" disabled={busy || !typed || !check.ready} className={submit}>
            {busy ? "Sending…" : "Continue"}
          </button>
          <p className="text-center text-sm text-ink-soft">
            We’ll send a one-time code. No password needed. Use the {phoneSignIn ? "number or email" : "email"} you booked with to see your trips.
          </p>
        </>
      ) : (
        <>
          <p className="text-ink-soft">
            {byPhone ? (
              <>
                We’ve sent a 6-digit code by SMS to <span className="text-ink">{maskMobile(mobile ?? "")}</span>.
              </>
            ) : (
              <>
                If <span className="text-ink">{typed}</span> can be used here, a 6-digit code is on its way.
              </>
            )}{" "}
            It expires in 10 minutes.
          </p>
          <TestModeCode code={testModeCode} byPhone={byPhone} />
          <CodeInput id="signin-code" value={code} onChange={setCode} error={error ?? undefined} />
          <button type="submit" disabled={busy || code.length !== 6} className={submit}>
            {busy ? "Checking…" : "Continue"}
          </button>
          <div className="flex justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("login");
                setCode("");
                setError(null);
              }}
              className={textButton}
            >
              {byPhone ? "Change number" : "Use a different email"}
            </button>
            <button type="button" onClick={() => sendCode()} disabled={busy || !check.ready} className={textButton}>
              Resend code
            </button>
          </div>
        </>
      )}
      <TurnstileWidget check={check} />
    </form>
  );
}
