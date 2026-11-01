"use client";

export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-medium text-white print:hidden"
    >
      {label}
    </button>
  );
}
