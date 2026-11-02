import type { Quote } from "@/lib/pricing/engine";

/** Split `amount` in proportion to `weights`, in pesewas, so the parts always add up exactly. */
export function allocate(amount: number, weights: number[]): number[] {
  const cents = Math.round(amount * 100);
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (!weights.length) return [];
  if (totalWeight <= 0) return weights.map((_, i) => (i === 0 ? cents / 100 : 0));
  const parts = weights.map((w) => Math.floor((cents * w) / totalWeight));
  let left = cents - parts.reduce((s, p) => s + p, 0);
  for (let i = 0; left > 0; i = (i + 1) % parts.length, left--) parts[i]! += 1;
  return parts.map((p) => p / 100);
}

export type VanBookingAmounts = {
  vehicle_type_id: string;
  passengers: number;
  subtotal: number;
  discount: number;
  total: number;
  deposit: number;
};

/** Per-van booking amounts for a (possibly multi-van) quote. Sums match the quote exactly. */
export function vanBookingAmounts(quote: Quote): VanBookingAmounts[] {
  const subtotals = quote.vans.map((v) => v.subtotal);
  const discounts = allocate(quote.discount, subtotals);
  const totals = subtotals.map((s, i) => Math.round((s - discounts[i]!) * 100) / 100);
  const deposits = allocate(quote.deposit, totals);
  return quote.vans.map((v, i) => ({
    vehicle_type_id: v.vehicleTypeId,
    passengers: v.passengers,
    subtotal: subtotals[i]!,
    discount: discounts[i]!,
    total: totals[i]!,
    deposit: deposits[i]!,
  }));
}
