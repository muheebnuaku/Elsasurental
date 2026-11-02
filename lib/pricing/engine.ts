// Pure pricing engine: no database, no network, no clock. Everything it needs is passed in,
// which keeps it fully unit-testable. All prices come from the `catalog` argument (the database).

import type { Database } from "@/types/supabase";

type TripType = Database["public"]["Enums"]["trip_type"];
type AddonUnit = Database["public"]["Enums"]["addon_unit"];

/** category "van" is chosen automatically by group size; "suv" only when the customer picks it. */
export type CatalogVanType = { id: string; slug: string; name: string; seats: number; category?: string };
export type CatalogRule = {
  vehicle_type_id: string;
  trip_type: TripType;
  base_price: number;
  included_km: number;
  included_hours: number;
  extra_km_rate: number;
  extra_hour_rate: number;
  night_surcharge_pct: number;
};
export type CatalogDestination = {
  slug: string;
  name: string;
  /** Fixed same-day-return price per vehicle type (vehicle_type_id → GH₵). */
  prices: Record<string, number>;
  est_hours: number;
  distance_km: number | null;
};
export type CatalogAddon = { id: string; slug: string; name: string; price: number; unit: AddonUnit };

export type PricingCatalog = {
  vanTypes: CatalogVanType[];
  rules: CatalogRule[];
  destinations: CatalogDestination[];
  addons: CatalogAddon[];
};

export type Promo = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_subtotal: number;
};

export type QuoteInput = {
  tripType: TripType;
  passengers: number;
  /** Force a van size; otherwise chosen from passenger count. */
  vehicleTypeSlug?: string;
  /** ISO timestamp of pick-up. */
  startAt: string;
  /** Hours the group needs the van (half/full day, events). */
  durationHours?: number;
  /** Number of days for multi_day trips. */
  days?: number;
  /** Total route distance in km, if known (from Google Maps). */
  distanceKm?: number | null;
  /** Fixed-price destination for outstation trips. */
  destinationSlug?: string;
  addons?: { slug: string; qty: number }[];
  promo?: Promo | null;
  companyDiscountPct?: number;
};

export type QuoteLine = { label: string; amount: number; kind: "base" | "extra" | "surcharge" | "addon" | "discount" };

export type Quote = {
  tripType: TripType;
  passengers: number;
  /** Per van: its share of the price (add-ons counted on the first van) and passengers riding in it. */
  vans: { slug: string; name: string; seats: number; vehicleTypeId: string; subtotal: number; passengers: number }[];
  lines: QuoteLine[];
  included: { km: number | null; hours: number };
  subtotal: number;
  discount: number;
  total: number;
  deposit: number;
  currency: "GHS";
  notes: string[];
};

export class QuoteError extends Error {}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A chosen type (forcedSlug) is used as is. Otherwise only vans are picked: 1–8 → 8-seater, 9–14 → 14-seater,
 * 15+ → mix of vans (largest first, smallest that fits for the rest). SUVs are used only when chosen.
 */
export function allocateVans(passengers: number, vanTypes: CatalogVanType[], forcedSlug?: string): CatalogVanType[] {
  if (!Number.isInteger(passengers) || passengers < 1) throw new QuoteError("Passengers must be at least 1");
  const all = [...vanTypes].sort((a, b) => a.seats - b.seats);
  if (!all.length) throw new QuoteError("No vehicles available");

  const forced = forcedSlug ? all.find((t) => t.slug === forcedSlug) : undefined;
  if (forcedSlug && !forced) throw new QuoteError(`Unknown vehicle type: ${forcedSlug}`);
  if (forced) return Array.from({ length: Math.ceil(passengers / forced.seats) }, () => forced);

  const vanOnly = all.filter((t) => (t.category ?? "van") === "van");
  const sorted = vanOnly.length ? vanOnly : all;

  const largest = sorted[sorted.length - 1]!;
  const vans: CatalogVanType[] = [];
  let remaining = passengers;
  while (remaining > 0) {
    const fit = sorted.find((t) => t.seats >= remaining);
    const pick = fit ?? largest;
    vans.push(pick);
    remaining -= pick.seats;
  }
  return vans;
}

/** Accra is GMT all year, so the UTC hour is the local hour. */
export function isNight(startAt: string, nightStartHour = 22, nightEndHour = 5) {
  const d = new Date(startAt);
  if (Number.isNaN(d.getTime())) throw new QuoteError("Invalid start time");
  const h = d.getUTCHours();
  return h >= nightStartHour || h < nightEndHour;
}

export function getQuote(
  input: QuoteInput,
  catalog: PricingCatalog,
  opts: { depositPct: number },
): Quote {
  const vans = allocateVans(input.passengers, catalog.vanTypes, input.vehicleTypeSlug);
  const night = isNight(input.startAt);
  const days = input.tripType === "multi_day" ? Math.max(1, Math.round(input.days ?? 1)) : 1;
  const destination =
    input.tripType === "outstation" && input.destinationSlug
      ? catalog.destinations.find((d) => d.slug === input.destinationSlug)
      : undefined;
  if (input.destinationSlug && input.tripType === "outstation" && !destination) {
    throw new QuoteError(`Unknown destination: ${input.destinationSlug}`);
  }

  const lines: QuoteLine[] = [];
  const notes: string[] = [];
  let includedKm: number | null = null;
  let includedHours = 0;

  const vanSubtotals: number[] = [];
  for (const van of vans) {
    const firstLine = lines.length;
    const rule = catalog.rules.find((r) => r.vehicle_type_id === van.id && r.trip_type === input.tripType);
    if (!rule) throw new QuoteError(`No price set for ${van.name} (${input.tripType})`);
    const label = vans.length > 1 ? `${van.name}` : "";

    let base: number;
    let vanIncludedKm: number | null;
    let vanIncludedHours: number;

    if (destination) {
      // Fixed price: same-day return from Accra, enough time for the drive both ways plus a few hours there.
      const fixed = destination.prices[van.id];
      if (fixed === undefined) throw new QuoteError(`No fixed price to ${destination.name} for the ${van.name} yet. Message us for a price.`);
      base = fixed;
      vanIncludedKm = null; // distance is covered by the fixed price
      vanIncludedHours = Math.max(rule.included_hours, destination.est_hours * 2 + 4);
      lines.push({ label: `${label ? label + " · " : ""}Accra ⇄ ${destination.name} (return)`, amount: base, kind: "base" });
    } else {
      base = rule.base_price * days;
      vanIncludedKm = rule.included_km * days;
      vanIncludedHours = rule.included_hours * days;
      const what = days > 1 ? `${days} days × ${rule.base_price}` : "Base price";
      lines.push({ label: `${label ? label + " · " : ""}${what}`, amount: base, kind: "base" });

      if (input.distanceKm != null && input.distanceKm > vanIncludedKm) {
        const extraKm = Math.ceil(input.distanceKm - vanIncludedKm);
        lines.push({
          label: `${label ? label + " · " : ""}Extra distance (${extraKm} km × ${rule.extra_km_rate})`,
          amount: round2(extraKm * rule.extra_km_rate),
          kind: "extra",
        });
      }
    }

    if (input.durationHours != null && input.durationHours > vanIncludedHours) {
      const extraHours = Math.ceil(input.durationHours - vanIncludedHours);
      lines.push({
        label: `${label ? label + " · " : ""}Extra time (${extraHours} h × ${rule.extra_hour_rate})`,
        amount: round2(extraHours * rule.extra_hour_rate),
        kind: "extra",
      });
    }

    if (night && rule.night_surcharge_pct > 0) {
      lines.push({
        label: `${label ? label + " · " : ""}Night surcharge (${rule.night_surcharge_pct}%, 10pm–5am)`,
        amount: round2((base * rule.night_surcharge_pct) / 100),
        kind: "surcharge",
      });
    }

    includedKm = vanIncludedKm;
    includedHours = vanIncludedHours;
    if (!destination && input.distanceKm == null && vanIncludedKm !== null) {
      const note = `Includes ${vanIncludedKm} km${vans.length > 1 ? " per van" : ""}. Extra km at ${rule.extra_km_rate}/km.`;
      if (!notes.includes(note)) notes.push(note);
    }
    vanSubtotals.push(round2(lines.slice(firstLine).reduce((sum, l) => sum + l.amount, 0)));
  }

  // Add-ons apply once per booking.
  for (const a of input.addons ?? []) {
    if (a.qty < 1) continue;
    const addon = catalog.addons.find((x) => x.slug === a.slug);
    if (!addon) throw new QuoteError(`Unknown add-on: ${a.slug}`);
    const qty = addon.unit === "per_trip" ? 1 : addon.unit === "per_day" ? days * a.qty : a.qty;
    lines.push({
      label: qty > 1 ? `${addon.name} × ${qty}` : addon.name,
      amount: round2(addon.price * qty),
      kind: "addon",
    });
  }

  const addonTotal = round2(lines.filter((l) => l.kind === "addon").reduce((sum, l) => sum + l.amount, 0));
  if (vanSubtotals.length) vanSubtotals[0] = round2(vanSubtotals[0]! + addonTotal);
  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));

  let discount = 0;
  if (input.promo) {
    const p = input.promo;
    if (subtotal >= p.min_subtotal) {
      const d = p.type === "percent" ? (subtotal * p.value) / 100 : p.value;
      discount += d;
      lines.push({ label: `Promo ${p.code}`, amount: -round2(d), kind: "discount" });
    } else {
      notes.push(`Promo ${p.code} needs a minimum of ${p.min_subtotal}.`);
    }
  }
  if (input.companyDiscountPct && input.companyDiscountPct > 0) {
    const d = ((subtotal - discount) * input.companyDiscountPct) / 100;
    discount += d;
    lines.push({ label: `Corporate discount (${input.companyDiscountPct}%)`, amount: -round2(d), kind: "discount" });
  }
  discount = round2(Math.min(discount, subtotal));

  const total = round2(subtotal - discount);
  const deposit = Math.ceil((total * opts.depositPct) / 100);

  return {
    tripType: input.tripType,
    passengers: input.passengers,
    vans: (() => {
      let riders = input.passengers;
      return vans.map((v, i) => {
        const inVan = Math.min(v.seats, riders);
        riders -= inVan;
        return { slug: v.slug, name: v.name, seats: v.seats, vehicleTypeId: v.id, subtotal: vanSubtotals[i] ?? 0, passengers: inVan };
      });
    })(),
    lines,
    included: { km: includedKm, hours: includedHours },
    subtotal,
    discount,
    total,
    deposit: Math.min(deposit, total),
    currency: "GHS",
    notes,
  };
}
