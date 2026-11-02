import { createHmac, timingSafeEqual } from "node:crypto";

// Signed quote token: the exact quote + inputs, HMAC-SHA256 signed, valid for 30 minutes.
// Checkout trusts only what's inside a valid token, so a price can't be edited in the browser.

function secret() {
  const s = process.env.QUOTE_SIGNING_SECRET;
  if (!s || s.length < 32) throw new Error("QUOTE_SIGNING_SECRET must be set (32+ chars)");
  return s;
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export function signQuoteToken<T>(payload: T, ttlMinutes: number, now = Date.now()): string {
  const body = b64(JSON.stringify({ p: payload, exp: now + ttlMinutes * 60_000 }));
  return `${body}.${sign(body)}`;
}

export function verifyQuoteToken<T>(token: string, now = Date.now()): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { p, exp } = JSON.parse(Buffer.from(body, "base64url").toString()) as { p: T; exp: number };
    return exp > now ? p : null;
  } catch {
    return null;
  }
}
