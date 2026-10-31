"use client";

import { useState } from "react";
import { Icon } from "./icons";

interface Props {
  brandName: string;
  whatsapp: string;
}

const QUICK = ["Is it available on my dates?", "Can you arrange a pickup?", "Are pets allowed?", "Do you offer long-stay rates?"];

// v0.1: compose here, deliver on WhatsApp (wa.me), with the page the guest was looking at
// attached so the host has context. v0.2 replaces the hand-off with on-site chat relayed to the
// host's WhatsApp through the Business API; this panel is where that conversation will live.
export function ChatLauncher({ brandName, whatsapp }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  function send(message: string) {
    const page = typeof window !== "undefined" ? window.location.href.split("#")[0] : "";
    const body = `${message.trim()}\n\n(Sent from ${page})`;
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(body)}`, "_blank", "noopener,noreferrer");
    setText("");
    setOpen(false);
  }

  return (
    // Desktop only: on smaller screens the bottom edge belongs to the booking bar, and chat lives in the menu.
    <div className="fixed bottom-6 right-6 z-40 hidden lg:block">
      {open && (
        <div
          role="dialog"
          aria-label={`Chat with ${brandName}`}
          className="mb-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-line"
        >
          <div className="flex items-center gap-3 bg-brand px-5 py-4 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg">{brandName.charAt(0)}</span>
            <div className="flex-1">
              <p>{brandName}</p>
              <p className="flex items-center gap-1.5 text-xs text-white/70">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Usually replies within an hour
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full p-1.5 hover:bg-white/10">
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4 bg-sand-deep/60 px-5 py-5">
            <p className="w-fit max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm shadow-sm">
              Hello! 👋 Ask us anything about our stays, dates or getting here.
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button key={q} type="button" onClick={() => send(q)} className="rounded-full bg-white px-3 py-1.5 text-xs ring-1 ring-line hover:ring-ink">
                  {q}
                </button>
              ))}
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) send(text);
            }}
            className="flex items-end gap-2 border-t border-line p-3"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={1}
              maxLength={1000}
              placeholder="Write a message…"
              aria-label="Message"
              className="max-h-28 flex-1 resize-none rounded-2xl bg-sand-deep px-4 py-2.5 text-sm outline-none"
            />
            <button type="submit" disabled={!text.trim()} className="rounded-full bg-brand p-3 text-white disabled:opacity-40" aria-label="Send on WhatsApp">
              <Icon name="arrowRight" className="h-4 w-4" />
            </button>
          </form>
          <p className="px-4 pb-3 text-center text-xs text-ink-soft">Messages open in WhatsApp</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close chat" : `Chat with ${brandName}`}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl transition hover:scale-105"
      >
        <Icon name={open ? "close" : "chat"} className="h-6 w-6" />
      </button>
    </div>
  );
}
