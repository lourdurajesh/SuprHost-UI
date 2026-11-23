import type { Quote } from "@/lib/pms/types";
import { formatMoney } from "@/lib/dates";

/** "₹4,500 × 27 nights": a block of nights at one nightly rate. */
const NIGHTLY_LINE = /^[^\d]*[\d,]+ × \d+ nights?$/;

/**
 * The one price breakdown every screen shows (listing panel, checkout, confirmation), so a guest
 * sees the same lines and the same total everywhere.
 *
 * Two clarifications for the guest, both derived from the quote itself:
 * - Several GST lines (the rate depends on each night's price) collapse into one "GST" row, with
 *   the split underneath in small print.
 * - When the stay mixes nightly rates, the average per night is stated, so the headline
 *   "from" price and the total reconcile.
 */
export function PriceBreakdown({ quote, className = "" }: { quote: Quote; className?: string }) {
  const money = (n: number) => formatMoney(n, quote.currency);
  const taxes = quote.taxes ?? [];
  const taxTotal = taxes.reduce((sum, t) => sum + t.amount, 0);
  // More than one "₹X × N nights" line means the rate changes within the stay. Only lines of exactly
  // that shape count: "Extra guest: 1 × ₹500 × 2 nights" is a fee, not a second nightly rate.
  const mixedRates = quote.lines.filter((l) => NIGHTLY_LINE.test(l.label)).length > 1;
  const average = quote.nightsTotal && quote.nights > 0 ? Math.round(quote.nightsTotal / quote.nights) : null;

  return (
    <div className={className}>
      <dl className="space-y-2 text-sm">
        {quote.lines.map((l) => (
          <div key={l.label} className="flex justify-between gap-4">
            <dt className="text-ink-soft">{l.label}</dt>
            <dd>{money(l.amount)}</dd>
          </div>
        ))}
        {taxes.length === 1 && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">{taxes[0].label}</dt>
            <dd>{money(taxes[0].amount)}</dd>
          </div>
        )}
        {taxes.length > 1 && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">GST</dt>
            <dd>{money(taxTotal)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 border-t border-line pt-3 text-lg font-medium">
          <dt>Total</dt>
          <dd>{money(quote.total)}</dd>
        </div>
      </dl>
      {taxes.length > 1 && (
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          {taxes.map((t) => `${t.label} ${money(t.amount)}`).join(" · ")}. The GST rate depends on each night’s price.
        </p>
      )}
      {mixedRates && average !== null && (
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          Nightly rates differ across your dates. Average {money(average)} a night, before fees and tax.
        </p>
      )}
    </div>
  );
}
