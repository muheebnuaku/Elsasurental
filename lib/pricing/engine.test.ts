import { describe, expect, it } from "vitest";
import { allocateVans, getQuote, isNight, QuoteError, type PricingCatalog } from "./engine";

const v8 = { id: "t8", slug: "8-seater", name: "8-Seater", seats: 8 };
const v14 = { id: "t14", slug: "14-seater", name: "14-Seater", seats: 14 };

const rule = (vehicle_type_id: string, trip_type: PricingCatalog["rules"][number]["trip_type"], base: number) => ({
  vehicle_type_id,
  trip_type,
  base_price: base,
  included_km: 100,
  included_hours: 5,
  extra_km_rate: 10,
  extra_hour_rate: 100,
  night_surcharge_pct: 20,
});

const catalog: PricingCatalog = {
  vanTypes: [v14, v8],
  rules: [
    rule("t8", "half_day", 1000),
    rule("t14", "half_day", 1500),
    rule("t8", "multi_day", 800),
    rule("t8", "outstation", 1200),
    rule("t14", "outstation", 1800),
  ],
  destinations: [
    { slug: "cape-coast", name: "Cape Coast", price_8_seater: 2600, price_14_seater: 3700, est_hours: 3, distance_km: 145 },
  ],
  addons: [
    { id: "a1", slug: "extra-stop", name: "Extra stop", price: 50, unit: "per_item" },
    { id: "a2", slug: "decorations", name: "Decorations", price: 300, unit: "per_trip" },
  ],
};

const day = "2030-05-10T09:00:00.000Z";
const opts = { depositPct: 30 };

describe("allocateVans", () => {
  it("picks the smallest van that fits", () => {
    expect(allocateVans(1, catalog.vanTypes).map((v) => v.seats)).toEqual([8]);
    expect(allocateVans(8, catalog.vanTypes).map((v) => v.seats)).toEqual([8]);
    expect(allocateVans(9, catalog.vanTypes).map((v) => v.seats)).toEqual([14]);
    expect(allocateVans(14, catalog.vanTypes).map((v) => v.seats)).toEqual([14]);
  });

  it("mixes vans for 15+ passengers", () => {
    expect(allocateVans(20, catalog.vanTypes).map((v) => v.seats)).toEqual([14, 8]);
    expect(allocateVans(28, catalog.vanTypes).map((v) => v.seats)).toEqual([14, 14]);
    expect(allocateVans(30, catalog.vanTypes).map((v) => v.seats)).toEqual([14, 14, 8]);
  });

  it("respects a forced van size", () => {
    expect(allocateVans(10, catalog.vanTypes, "8-seater").map((v) => v.seats)).toEqual([8, 8]);
  });

  it("rejects bad input", () => {
    expect(() => allocateVans(0, catalog.vanTypes)).toThrow(QuoteError);
    expect(() => allocateVans(5, catalog.vanTypes, "bus")).toThrow(QuoteError);
  });
});

describe("isNight", () => {
  it("treats 22:00–04:59 Accra time as night", () => {
    expect(isNight("2030-05-10T21:59:00Z")).toBe(false);
    expect(isNight("2030-05-10T22:00:00Z")).toBe(true);
    expect(isNight("2030-05-10T04:59:00Z")).toBe(true);
    expect(isNight("2030-05-10T05:00:00Z")).toBe(false);
  });
});

describe("getQuote", () => {
  it("prices a simple half day", () => {
    const q = getQuote({ tripType: "half_day", passengers: 6, startAt: day }, catalog, opts);
    expect(q.vans).toHaveLength(1);
    expect(q.total).toBe(1000);
    expect(q.deposit).toBe(300);
    expect(q.notes[0]).toMatch(/100 km/);
  });

  it("charges extra km and extra hours", () => {
    const q = getQuote({ tripType: "half_day", passengers: 6, startAt: day, distanceKm: 130.2, durationHours: 6.5 }, catalog, opts);
    // 1000 + 31 km × 10 + 2 h × 100
    expect(q.subtotal).toBe(1000 + 310 + 200);
  });

  it("adds the night surcharge on the base price only", () => {
    const q = getQuote({ tripType: "half_day", passengers: 6, startAt: "2030-05-10T23:00:00Z" }, catalog, opts);
    expect(q.total).toBe(1200);
  });

  it("uses fixed destination prices for outstation trips", () => {
    const small = getQuote({ tripType: "outstation", passengers: 5, startAt: day, destinationSlug: "cape-coast" }, catalog, opts);
    const big = getQuote({ tripType: "outstation", passengers: 12, startAt: day, destinationSlug: "cape-coast" }, catalog, opts);
    expect(small.total).toBe(2600);
    expect(big.total).toBe(3700);
    expect(small.included.km).toBeNull();
    expect(small.included.hours).toBe(10); // 3h each way + 4h there
  });

  it("prices every van for big groups", () => {
    const q = getQuote({ tripType: "half_day", passengers: 20, startAt: day }, catalog, opts);
    expect(q.vans.map((v) => v.seats)).toEqual([14, 8]);
    expect(q.total).toBe(2500);
  });

  it("multiplies multi-day by days", () => {
    const q = getQuote({ tripType: "multi_day", passengers: 4, startAt: day, days: 3 }, catalog, opts);
    expect(q.total).toBe(2400);
    expect(q.included.hours).toBe(15);
  });

  it("adds add-ons once per booking", () => {
    const q = getQuote(
      { tripType: "half_day", passengers: 20, startAt: day, addons: [{ slug: "extra-stop", qty: 2 }, { slug: "decorations", qty: 5 }] },
      catalog,
      opts,
    );
    expect(q.total).toBe(2500 + 100 + 300);
  });

  it("applies promo then corporate discount, never below zero", () => {
    const q = getQuote(
      { tripType: "half_day", passengers: 6, startAt: day, promo: { code: "TEN", type: "percent", value: 10, min_subtotal: 0 }, companyDiscountPct: 10 },
      catalog,
      opts,
    );
    expect(q.discount).toBe(190); // 100 + 10% of 900
    expect(q.total).toBe(810);

    const huge = getQuote(
      { tripType: "half_day", passengers: 6, startAt: day, promo: { code: "BIG", type: "fixed", value: 5000, min_subtotal: 0 } },
      catalog,
      opts,
    );
    expect(huge.total).toBe(0);
  });

  it("ignores a promo below its minimum and says why", () => {
    const q = getQuote(
      { tripType: "half_day", passengers: 6, startAt: day, promo: { code: "MIN", type: "fixed", value: 100, min_subtotal: 5000 } },
      catalog,
      opts,
    );
    expect(q.total).toBe(1000);
    expect(q.notes.join(" ")).toMatch(/MIN/);
  });

  it("errors when no price is configured", () => {
    expect(() => getQuote({ tripType: "airport", passengers: 6, startAt: day }, catalog, opts)).toThrow(QuoteError);
  });
});
