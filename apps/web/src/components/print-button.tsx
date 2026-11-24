"use client";

export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center rounded-xl bg-brand px-5 text-sm font-medium text-white print:hidden"
    >
      {label}
    </button>
  );
}
