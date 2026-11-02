import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyStandardWebhook } from "./standard";

const key = Buffer.from("super-secret-test-key-0123456789");
const secret = `v1,whsec_${key.toString("base64")}`;
const body = JSON.stringify({ user: { phone: "233241234567" }, sms: { otp: "123456" } });

function headersFor(ts: number, payload = body, k = key) {
  const sig = createHmac("sha256", k).update(`msg_1.${ts}.${payload}`).digest("base64");
  return new Headers({ "webhook-id": "msg_1", "webhook-timestamp": String(ts), "webhook-signature": `v1,${sig}` });
}

describe("verifyStandardWebhook", () => {
  it("accepts a valid signature", () => {
    expect(verifyStandardWebhook(secret, headersFor(1000), body, 300, 1000)).toBe(true);
  });
  it("rejects a tampered body", () => {
    expect(verifyStandardWebhook(secret, headersFor(1000), body.replace("123456", "000000"), 300, 1000)).toBe(false);
  });
  it("rejects the wrong key", () => {
    expect(verifyStandardWebhook(secret, headersFor(1000, body, Buffer.from("another-key")), body, 300, 1000)).toBe(false);
  });
  it("rejects old timestamps (replays)", () => {
    expect(verifyStandardWebhook(secret, headersFor(1000), body, 300, 1000 + 301)).toBe(false);
  });
  it("rejects missing headers", () => {
    expect(verifyStandardWebhook(secret, new Headers(), body)).toBe(false);
  });
});
