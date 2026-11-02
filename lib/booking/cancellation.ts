import { cancellationPolicy } from "@/lib/site";

export type RefundQuote = { hoursBefore: number; pct: number; amount: number };

/**
 * Refund under the cancellation policy (site.ts): full refund > 48h before pick-up, 50% at 24–48h, none < 24h.
 * `paid` is what the customer has paid so far; the refund never exceeds it.
 */
export function refundFor(startAt: string | Date, paid: number, now: Date = new Date()): RefundQuote {
  const hoursBefore = (new Date(startAt).getTime() - now.getTime()) / 3_600_000;
  const rule = cancellationPolicy.find((p) => hoursBefore >= p.minHoursBefore) ?? cancellationPolicy[cancellationPolicy.length - 1]!;
  const amount = Math.floor(Math.max(0, paid) * rule.refundPct) / 100;
  return { hoursBefore, pct: hoursBefore < 0 ? 0 : rule.refundPct, amount: hoursBefore < 0 ? 0 : amount };
}
