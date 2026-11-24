"use client";

export { maskMobile, toMobile } from "@/lib/mobile";

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
}

// An Indian mobile number field: a fixed +91 prefix and a numeric keypad, so guests type only the
// 10 digits. Pasted numbers with +91, spaces or a leading 0 are accepted as they are.
export function MobileField({ id, value, onChange, label = "Mobile number", error, autoFocus, readOnly }: Props) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div
        className={`mt-1.5 flex items-stretch overflow-hidden rounded-xl border bg-white transition focus-within:border-ink ${
          error ? "border-red-600" : "border-field"
        } ${readOnly ? "bg-sand text-ink-soft" : ""}`}
      >
        <span className="flex items-center border-r border-line bg-sand px-3.5 text-base text-ink-soft">+91</span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required
          maxLength={16}
          placeholder="98450 12345"
          value={value}
          autoFocus={autoFocus}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="focus-own min-w-0 flex-1 bg-transparent px-4 py-3.5 text-base outline-none read-only:text-ink-soft"
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
