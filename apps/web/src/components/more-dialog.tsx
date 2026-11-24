"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { buttonClass, textButton } from "./ui/button";
import { Dialog, DialogBody, DialogHeader } from "./ui/dialog";

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
      <Dialog open={open} onClose={close} size="lg" phone="full">
        <DialogHeader title={title} />
        <DialogBody text>{children}</DialogBody>
      </Dialog>
    </>
  );
}
