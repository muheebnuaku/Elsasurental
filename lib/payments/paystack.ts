import { createHmac, timingSafeEqual } from "node:crypto";
import type { Database } from "@/types/supabase";

// Paystack (Ghana): Mobile Money (MTN, Telecel, AirtelTigo) + card. Amounts go to Paystack in pesewas.
// Never log or store full card / MoMo details — `sanitize` keeps only what receipts need.

// PAYSTACK_API_BASE is for automated tests only (points at a local stand-in); defaults to the real API.
const api = () => process.env.PAYSTACK_API_BASE || "https://api.paystack.co";
type Method = Database["public"]["Enums"]["payment_method"];

const secret = () => process.env.PAYSTACK_SECRET_KEY ?? "";

export function paystackConfigured() {
  const key = secret();
  return /^sk_(test|live)_/.test(key) && !key.endsWith("_xxx");
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${api()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || !body.status || !body.data) throw new Error(`Paystack: ${body.message ?? res.status}`);
  return body.data;
}

export async function initializeTransaction(input: {
  email: string;
  amountGhs: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}) {
  const data = await call<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountGhs * 100),
      currency: "GHS",
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ["mobile_money", "card"],
      metadata: input.metadata,
    }),
  });
  return { authorizationUrl: data.authorization_url, reference: data.reference };
}

type PaystackTransaction = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel: string;
  paid_at: string | null;
  gateway_response?: string;
  authorization?: { channel?: string; card_type?: string; last4?: string; bank?: string; brand?: string };
  metadata?: unknown;
};

export async function verifyTransaction(reference: string) {
  const t = await call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
  return normalize(t);
}

export function normalize(t: PaystackTransaction) {
  return {
    success: t.status === "success",
    status: t.status,
    reference: t.reference,
    amountGhs: t.amount / 100,
    method: methodFromChannel(t.channel),
    paidAt: t.paid_at,
    raw: sanitize(t),
  };
}

export function methodFromChannel(channel: string | undefined): Method | null {
  if (channel === "mobile_money") return "momo";
  if (channel === "card") return "card";
  if (channel === "bank" || channel === "bank_transfer") return "bank_transfer";
  return null;
}

/** Keep only receipt-safe fields: no full card numbers, no MoMo numbers, no customer data. */
export function sanitize(t: PaystackTransaction) {
  return {
    id: t.id,
    status: t.status,
    reference: t.reference,
    amount: t.amount,
    currency: t.currency,
    channel: t.channel,
    paid_at: t.paid_at,
    gateway_response: t.gateway_response ?? null,
    authorization: t.authorization
      ? { channel: t.authorization.channel ?? null, card_type: t.authorization.card_type ?? null, last4: t.authorization.last4 ?? null, bank: t.authorization.bank ?? null }
      : null,
  };
}

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using your secret key. */
export function verifyWebhookSignature(rawBody: string, signature: string | null, key = secret()): boolean {
  if (!signature || !key) return false;
  const expected = Buffer.from(createHmac("sha512", key).update(rawBody).digest("hex"));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Paystack needs an email; customers without one get a stable placeholder tied to their phone. */
export function paystackEmail(email: string | null | undefined, phone: string) {
  return email && /.+@.+\..+/.test(email) ? email : `${phone.replace(/\D/g, "")}@customers.elsasu.com`;
}

/** Refund (all or part of) a successful transaction. Paystack processes it asynchronously (refund.processed webhook). */
export async function createRefund(transactionReference: string, amountGhs: number) {
  const data = await call<{ id?: number; status?: string; amount?: number }>("/refund", {
    method: "POST",
    body: JSON.stringify({ transaction: transactionReference, amount: Math.round(amountGhs * 100) }),
  });
  return { refundId: data.id ? String(data.id) : null, status: data.status ?? "pending" };
}
