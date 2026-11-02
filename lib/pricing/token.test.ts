import { beforeAll, describe, expect, it } from "vitest";
import { signQuoteToken, verifyQuoteToken } from "./token";

beforeAll(() => {
  process.env.QUOTE_SIGNING_SECRET = "test-secret-that-is-at-least-32-characters";
});

describe("quote tokens", () => {
  it("round-trips a payload", () => {
    const t = signQuoteToken({ total: 1000 }, 30, 0);
    expect(verifyQuoteToken<{ total: number }>(t, 1000)).toEqual({ total: 1000 });
  });

  it("rejects an expired token", () => {
    const t = signQuoteToken({ total: 1000 }, 30, 0);
    expect(verifyQuoteToken(t, 31 * 60_000)).toBeNull();
  });

  it("rejects a tampered price", () => {
    const t = signQuoteToken({ total: 1000 }, 30, 0);
    const [, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ p: { total: 1 }, exp: 60 * 60_000 })).toString("base64url");
    expect(verifyQuoteToken(`${forged}.${sig}`, 1000)).toBeNull();
    expect(verifyQuoteToken("garbage", 1000)).toBeNull();
  });
});
