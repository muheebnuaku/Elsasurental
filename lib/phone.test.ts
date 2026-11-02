import { describe, expect, it } from "vitest";
import { formatGhanaPhone, normalizeGhanaPhone } from "./phone";

describe("normalizeGhanaPhone", () => {
  it.each([
    ["0241234567", "+233241234567"],
    ["024 123 4567", "+233241234567"],
    ["+233 24 123 4567", "+233241234567"],
    ["233241234567", "+233241234567"],
    ["00233501234567", "+233501234567"],
    ["551234567", "+233551234567"],
    ["(020) 000-0001", "+233200000001"],
  ])("%s → %s", (input, out) => {
    expect(normalizeGhanaPhone(input)).toBe(out);
  });

  it.each(["", "12345", "0301234567", "+2332412345", "+44 7700 900123", "02412345678"])("rejects %s", (input) => {
    expect(normalizeGhanaPhone(input)).toBeNull();
  });
});

describe("formatGhanaPhone", () => {
  it("formats for display", () => {
    expect(formatGhanaPhone("+233241234567")).toBe("024 123 4567");
  });
});
