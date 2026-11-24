"use client";

/** Where messages aren't sent yet (development, staging), the PMS returns the code to show here. */
export function TestModeCode({ code, byPhone }: { code: string | null; byPhone: boolean }) {
  if (!code) return null;
  return (
    <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong>Test mode:</strong> {byPhone ? "text messages" : "emails"} aren’t sent yet. Your code is{" "}
      <span className="font-mono text-base tracking-widest">{code}</span>
    </p>
  );
}

/** The 6-digit code. Phones offer it from the message. */
export function CodeInput({ id, value, onChange, error }: { id: string; value: string; onChange: (code: string) => void; error?: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        6-digit code
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        required
        autoFocus
        value={value}
        placeholder="••••••"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        className="focus-own mt-1.5 min-h-15 w-full rounded-xl border border-field bg-white px-4 text-center font-mono text-2xl tracking-[0.5em] outline-none placeholder:text-ink-soft focus:border-ink focus:ring-1 focus:ring-ink"
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** Hidden from people and screen readers, irresistible to form-filling bots. */
export function Honeypot({ id }: { id: string }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor={id}>Website</label>
      <input id={id} name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

export const honeypotValue = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? "";
