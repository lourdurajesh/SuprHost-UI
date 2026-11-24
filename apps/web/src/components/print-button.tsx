"use client";

import { buttonClass } from "./ui/button";

export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`${buttonClass("primary", "sm")} print:hidden`}
    >
      {label}
    </button>
  );
}
