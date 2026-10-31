"use client";

import Link from "next/link";
import { useRef } from "react";
import { Icon } from "./icons";

interface Props {
  brandName: string;
  whatsapp: string | null;
  phone: string | null;
}

// Below md the header keeps only the brand, "Book now" and this menu. A native modal dialog gives
// focus trapping, Escape to close and an inert page behind it for free.
export function MobileMenu({ brandName, whatsapp, phone }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();
  const item = "flex min-h-12 items-center border-b border-line text-lg";

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label="Open menu"
        className="grid h-11 w-11 place-items-center rounded-full ring-1 ring-line md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>
      <dialog
        ref={dialog}
        aria-label={`${brandName} menu`}
        onClick={(e) => e.target === dialog.current && close()}
        className="ml-auto mr-0 h-dvh max-h-none w-[min(22rem,100vw)] max-w-none flex-col bg-white p-0 text-ink backdrop:bg-black/40 open:flex"
      >
        <div className="flex h-[76px] items-center justify-between px-5">
          <span className="text-h3">{brandName}</span>
          <button type="button" onClick={close} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand-deep">
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label="Menu" className="flex flex-1 flex-col overflow-y-auto px-5">
          <Link href="/stays" onClick={close} className={item}>Stays</Link>
          <Link href="/#about" onClick={close} className={item}>Our story</Link>
          <Link href="/#faq" onClick={close} className={item}>FAQ</Link>
          <Link href="/policies" onClick={close} className={item}>Policies</Link>
          <Link href="/account" onClick={close} className={item}>Your trips</Link>
          <div className="mt-auto space-y-3 py-6">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 items-center justify-center gap-2 rounded-full ring-1 ring-line"
              >
                <Icon name="chat" className="h-4 w-4" /> Chat on WhatsApp
              </a>
            )}
            {phone && (
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex min-h-12 items-center justify-center gap-2 rounded-full ring-1 ring-line">
                <Icon name="phone" className="h-4 w-4" /> {phone}
              </a>
            )}
            <Link href="/stays" onClick={close} className="flex min-h-12 items-center justify-center rounded-full bg-brand text-white">
              Book now
            </Link>
          </div>
        </nav>
      </dialog>
    </>
  );
}
