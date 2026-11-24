import type { Site } from "@/lib/pms";

/** Questions that open in place. */
export function FaqList({ items }: { items: Site["faqs"] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((f) => (
        <details key={f.q} className="group py-6 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg">
            {f.q}
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-line transition group-open:rotate-45">
              <span className="text-xl leading-none">+</span>
            </span>
          </summary>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
