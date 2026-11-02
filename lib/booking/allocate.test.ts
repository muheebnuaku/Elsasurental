import { describe, expect, it } from "vitest";
import { allocate, vanBookingAmounts } from "./allocate";
import { getQuote, type PricingCatalog } from "@/lib/pricing/engine";

describe("allocate", () => {
  it("splits proportionally and always sums exactly", () => {
    expect(allocate(100, [1, 1, 1])).toEqual([33.34, 33.33, 33.33]);
    expect(allocate(1110, [2300, 1600]).reduce((a, b) => a + b, 0)).toBeCloseTo(1110, 2);
    expect(allocate(0, [5, 5])).toEqual([0, 0]);
    expect(allocate(50, [0, 0])).toEqual([50, 0]);
  });
});

const catalog: PricingCatalog = {
  vanTypes: [
    { id: "t8", slug: "8-seater", name: "8-Seater", seats: 8 },
    { id: "t14", slug: "14-seater", name: "14-Seater", seats: 14 },
  ],
  rules: (["t8", "t14"] as const).map((id) => ({
    vehicle_type_id: id, trip_type: "event" as const, base_price: id === "t8" ? 1600 : 2300,
    included_km: 100, included_hours: 8, extra_km_rate: 10, extra_hour_rate: 100, night_surcharge_pct: 0,
  })),
  destinations: [],
  addons: [{ id: "a", slug: "decorations", name: "Decorations", price: 300, unit: "per_trip" }],
};

describe("vanBookingAmounts", () => {
  it("gives each van its own share; totals and deposits add up to the quote", () => {
    const q = getQuote(
      { tripType: "event", passengers: 20, startAt: "2030-05-10T09:00:00Z", addons: [{ slug: "decorations", qty: 1 }],
        promo: { code: "TEN", type: "percent", value: 10, min_subtotal: 0 } },
      catalog,
      { depositPct: 30 },
    );
    const parts = vanBookingAmounts(q);
    expect(parts.map((p) => p.vehicle_type_id)).toEqual(["t14", "t8"]);
    expect(parts.map((p) => p.passengers)).toEqual([14, 6]);
    expect(parts[0]!.subtotal).toBe(2300 + 300); // add-on rides with the first van
    const sum = (k: "subtotal" | "discount" | "total" | "deposit") => Math.round(parts.reduce((s, p) => s + p[k], 0) * 100) / 100;
    expect(sum("subtotal")).toBe(q.subtotal);
    expect(sum("discount")).toBe(q.discount);
    expect(sum("total")).toBe(q.total);
    expect(sum("deposit")).toBe(q.deposit);
  });
});
