"use client";

import { useRef, useState } from "react";
import type { ListingImage } from "@/lib/pms/types";
import { useBrowserValue } from "@/lib/browser";
import { isIsoDate } from "@/lib/dates";
import { shortPath } from "@/lib/short-link";
import { mediaSrc } from "@/themes/escape/listing-media";
import { Icon } from "./icons";
import { Dialog, DialogClose } from "./ui/dialog";

interface Props {
  listingId: string;
  name: string;
  /** "Apartment in Chennai · 2 bedrooms" */
  facts: string;
  image: ListingImage | null;
  /** "text": icon and word (desktop). "icon": round button over a photo (phones). */
  variant?: "text" | "icon";
  className?: string;
}

/** Share a home with a short link on this site, carrying the dates and guests the visitor has chosen. */
export function ShareButton({ listingId, name, facts, image, variant = "text", className = "" }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const close = () => setUrl(null);
  const [copied, setCopied] = useState(false);
  const canShare = useBrowserValue(() => typeof navigator.share === "function", false);

  function open() {
    const p = new URLSearchParams(window.location.search);
    const ci = p.get("checkIn");
    const co = p.get("checkOut");
    const dated = ci && co && isIsoDate(ci) && isIsoDate(co);
    setUrl(window.location.origin + shortPath(listingId, dated ? { checkIn: ci, checkOut: co, guests: Number(p.get("guests")) || null } : {}));
    setCopied(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url ?? "");
    } catch {
      // Clipboard blocked: select the address so it can be copied by hand.
      field.current?.select();
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const text = `${name}: ${url}`;
  const item = "focus-own flex min-h-14 items-center gap-4 rounded-xl px-4 text-left ring-1 ring-line transition hover:bg-sand-deep focus-visible:ring-2 focus-visible:ring-ink";
  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={variant === "icon" ? `Share ${name}` : undefined}
        className={`${
          variant === "icon"
            ? "grid h-11 w-11 place-items-center rounded-full bg-white/95 shadow-sm"
            : "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-sand-deep"
        } ${className}`}
      >
        <Icon name="share" className={variant === "icon" ? "h-5 w-5" : "h-4 w-4"} />
        {variant === "text" && <span className="underline underline-offset-2">Share</span>}
      </button>

      <Dialog open={url !== null} onClose={close} label="Share this place" width="34rem">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-h2">Share this place</h2>
          <DialogClose onClose={close} className="-mr-2 -mt-2" />
        </div>
        <div className="mt-5 flex items-center gap-4">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element -- a 64px thumbnail of a photo already on the page
            <img src={mediaSrc(image.url)} alt="" width={64} height={64} loading="lazy" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
          )}
          <p className="min-w-0">
            <span className="block truncate font-medium">{name}</span>
            <span className="block truncate text-sm text-ink-soft">{facts}</span>
          </p>
        </div>

        <div className="mt-5 flex items-stretch overflow-hidden rounded-xl ring-1 ring-field focus-within:ring-2 focus-within:ring-ink">
          <input ref={field} readOnly value={url ?? ""} aria-label="Short link" onFocus={(e) => e.target.select()} className="focus-own min-w-0 flex-1 bg-transparent px-4 py-3 text-base outline-none" />
          <button type="button" onClick={copy} className="focus-own shrink-0 border-l border-line px-5 font-medium hover:bg-sand-deep focus-visible:bg-sand-deep">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p role="status" className="sr-only">
          {copied ? "Link copied" : ""}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className={item}>
            <Icon name="chat" /> WhatsApp
          </a>
          <a href={`mailto:?subject=${encodeURIComponent(name)}&body=${encodeURIComponent(text)}`} className={item}>
            <Icon name="mail" /> Email
          </a>
          <a href={`sms:?&body=${encodeURIComponent(text)}`} className={item}>
            <Icon name="phone" /> Messages
          </a>
          {canShare && (
            <button type="button" onClick={() => navigator.share({ title: name, url: url ?? "" }).catch(() => undefined)} className={item}>
              <Icon name="share" /> More options
            </button>
          )}
        </div>
      </Dialog>
    </>
  );
}
