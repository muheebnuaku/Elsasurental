import { describe, expect, it } from "vitest";
import { driverDigest, driverMessage, type DriverTrip } from "./driver";

const trip: DriverTrip = {
  ref: "ELS-ABC12",
  startAt: "2030-11-14T06:00:00.000Z",
  tripType: "outstation",
  pickup: "East Legon",
  dropoff: "Cape Coast",
  passengers: 12,
  customerName: "Esi Owusu",
  customerPhone: "+233241234567",
  plate: "GR 1401-24",
};

describe("driver texts", () => {
  it("gives the driver everything for a new trip", () => {
    const t = driverMessage("trip_assigned", trip);
    for (const part of ["ELS-ABC12", "06:00", "East Legon to Cape Coast", "12 passengers", "GR 1401-24", "Esi Owusu", "024 123 4567", "/driver"]) {
      expect(t).toContain(part);
    }
  });
  it("says clearly when a trip is taken away or cancelled", () => {
    expect(driverMessage("trip_removed", trip)).toMatch(/ELS-ABC12 .* no longer assigned to you/);
    expect(driverMessage("trip_cancelled", trip)).toMatch(/ELS-ABC12 .* cancelled\. You don't need to go/);
  });
  it("never shows prices", () => {
    for (const e of ["trip_assigned", "trip_removed", "trip_cancelled"] as const) expect(driverMessage(e, trip)).not.toMatch(/GH|GHS|₵/);
  });
  it("lists tomorrow's trips and summarises the rest", () => {
    const d = driverDigest("Thu 14 Nov", Array.from({ length: 6 }, (_, i) => ({ ...trip, ref: `ELS-T${i}` })));
    expect(d).toContain("ELS-T0");
    expect(d).toContain("ELS-T3");
    expect(d).not.toContain("ELS-T4");
    expect(d).toContain("+2 more");
  });
});
