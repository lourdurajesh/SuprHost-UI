"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation as ConversationData } from "@/lib/pms/types";
import { Icon } from "./icons";
import { buttonClass, fieldClass } from "./ui/button";

/** How often to check for the host's messages: quickly while the two of you are chatting, slowly once it goes quiet. */
const ACTIVE_POLL_MS = 3_000;
const QUIET_POLL_MS = 15_000;
/** A conversation counts as active this long after its last message. */
const ACTIVE_FOR_MS = 5 * 60_000;

function pollInterval(data: ConversationData) {
  const last = data.messages[data.messages.length - 1];
  return last && Date.now() - Date.parse(last.sentAt) < ACTIVE_FOR_MS ? ACTIVE_POLL_MS : QUIET_POLL_MS;
}

/**
 * The guest–host conversation on the booking page. New messages from the host show up while the
 * page is open (checked every 3 seconds while the two are chatting, every 15 once it goes quiet,
 * and not while the page is hidden); the host is emailed about the guest's.
 */
export function Conversation({ token, initial, timezone }: { token: string; initial: ConversationData; timezone: string }) {
  const [data, setData] = useState(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const url = `/api/bookings/${encodeURIComponent(token)}/messages`;

  // Counts checks, so the next one is scheduled even when a check fails or nothing changed.
  const [checks, setChecks] = useState(0);

  const refresh = useCallback(async () => {
    const r = await fetch(url, { cache: "no-store" }).catch(() => null);
    if (r?.ok) setData(await r.json());
    setChecks((n) => n + 1);
  }, [url]);

  // Checks again after each answer, at the pace the conversation sets; only while the page is visible,
  // and at once when the guest comes back to it.
  useEffect(() => {
    if (!data.canSend) return;
    const id = window.setTimeout(() => {
      // Hidden: skip this check but keep the schedule going.
      if (document.visibilityState === "visible") void refresh();
      else setChecks((n) => n + 1);
    }, pollInterval(data));
    return () => window.clearTimeout(id);
  }, [data, checks, refresh]);

  useEffect(() => {
    const back = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [refresh]);

  // Keep the newest message in view.
  const count = data.messages.length;
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [count]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) }).catch(() => null);
    setSending(false);
    if (r?.ok) {
      setData(await r.json());
      setDraft("");
      return;
    }
    const problem = await r?.json().catch(() => null);
    setError(problem?.message ?? "Your message didn’t send. Please try again.");
  }

  const time = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: timezone });

  return (
    <section aria-labelledby="messages-title" className="rounded-2xl border border-line bg-white">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Icon name="chat" className="h-5 w-5 text-accent" />
        <div>
          <h2 id="messages-title" className="font-medium">
            Messages with {data.hostName}
          </h2>
          <p className="text-sm text-ink-soft">Ask anything or agree the details here. The host gets each message by email.</p>
        </div>
      </div>

      {count > 0 ? (
        <ol ref={list} className="max-h-[22rem] space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
          {data.messages.map((m) => (
            <li key={m.id} className={`flex flex-col ${m.fromHost ? "items-start" : "items-end"}`}>
              <p
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[0.9375rem] ${
                  m.fromHost ? "rounded-bl-md bg-sand-deep text-ink" : "rounded-br-md bg-ink text-white"
                }`}
              >
                {m.body}
              </p>
              <span className="mt-1 text-xs text-ink-soft">
                {m.fromHost ? data.hostName : "You"} · {time.format(new Date(m.sentAt))}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-5 py-6 text-sm text-ink-soft">No messages yet. Introduce yourself, or ask the host a question.</p>
      )}

      {data.canSend ? (
        <form onSubmit={send} className="border-t border-line p-4">
          <label htmlFor="message-draft" className="sr-only">
            Write a message
          </label>
          <textarea
            id="message-draft"
            rows={2}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(e);
            }}
            placeholder={`Message ${data.hostName}…`}
            className={fieldClass}
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="mt-3 flex justify-end">
            <button type="submit" disabled={sending || !draft.trim()} className={buttonClass("dark", "sm")}>
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      ) : (
        <p className="border-t border-line px-5 py-4 text-sm text-ink-soft">This conversation has ended.</p>
      )}
    </section>
  );
}
