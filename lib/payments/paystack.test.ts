import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { methodFromChannel, normalize, paystackEmail, sanitize, verifyWebhookSignature } from "./paystack";

const key = "sk_test_unit_secret";
const body = JSON.stringify({ event: "charge.success", data: { reference: "ELS-ABCDE-123456", amount: 111000 } });
const sign = (b: string, k = key) => createHmac("sha512", k).update(b).digest("hex");

describe("verifyWebhookSignature", () => {
  it("accepts Paystack's signature", () => expect(verifyWebhookSignature(body, sign(body), key)).toBe(true));
  it("rejects a tampered body", () => expect(verifyWebhookSignature(body.replace("111000", "1"), sign(body), key)).toBe(false));
  it("rejects the wrong key or no signature", () => {
    expect(verifyWebhookSignature(body, sign(body, "other"), key)).toBe(false);
    expect(verifyWebhookSignature(body, null, key)).toBe(false);
  });
});

describe("transaction normalising", () => {
  const tx = {
    id: 1, status: "success", reference: "R1", amount: 111000, currency: "GHS", channel: "mobile_money", paid_at: "2030-01-01T10:00:00Z",
    authorization: { channel: "mobile_money", bank: "MTN", last4: "1234", card_type: undefined, authorization_code: "AUTH_secret", bin: "024" } as never,
    customer: { phone: "0241234567", email: "x@y.com" },
  };

  it("converts pesewas and maps the channel", () => {
    const n = normalize(tx);
    expect(n.amountGhs).toBe(1110);
    expect(n.method).toBe("momo");
    expect(methodFromChannel("card")).toBe("card");
    expect(methodFromChannel("ussd")).toBeNull();
  });

  it("never keeps sensitive fields", () => {
    const raw = JSON.stringify(sanitize(tx));
    expect(raw).not.toContain("AUTH_secret");
    expect(raw).not.toContain("0241234567");
    expect(raw).not.toContain("x@y.com");
  });

  it("uses a placeholder email when the customer has none", () => {
    expect(paystackEmail(null, "+233241234567")).toBe("233241234567@customers.elsasu.com");
    expect(paystackEmail("ama@example.com", "+233241234567")).toBe("ama@example.com");
  });
});
