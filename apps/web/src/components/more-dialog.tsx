"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { buttonClass, textButton } from "./ui/button";
import { Dialog, DialogClose } from "./ui/dialog";

/** "Show all …": a button that opens the full text or list in a dialog. */
export function MoreDialog({ label, title, variant = "button", children }: { label: string; title: string; variant?: "button" | "link"; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={variant === "link" ? `${textButton} gap-1` : `${buttonClass("soft")} max-sm:w-full`}>
        {label}
        {variant === "link" && <Icon name="chevronRight" className="h-4 w-4" />}
      </button>
      <Dialog open={open} onClose={close} label={title} layout="panel" width="46rem" phone="full">
        <div className="flex shrink-0 px-4 py-3">
          <DialogClose onClose={close} />
        </div>
        <div className="relative min-h-0 flex-1 overflow-y-auto px-6 pb-8 sm:px-8">
          <h2 className="text-[1.625rem] leading-tight">{title}</h2>
          <div className="mt-6">{children}</div>
        </div>
      </Dialog>
    </>
  );
}
