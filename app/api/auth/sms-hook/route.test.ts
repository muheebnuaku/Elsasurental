import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Which channel the login code goes by: WhatsApp first, SMS for a resend or when WhatsApp isn't set up.

const sent: { channel: string; to: string; code: string }[] = [];
let lastDelivery: { channel: string; sent_at: string } | null = null;
let pending: Promise<unknown> = Promise.resolve();

vi.mock("next/server", () => ({ after: (fn: () => Promise<unknown>) => { pending = fn(); } }));
vi.mock("@/lib/observability", () => ({ reportError: vi.fn() }));
vi.mock("@/lib/notifications/channels", () => ({
  whatsappConfigured: () => Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
  sendWhatsAppCode: async (to: string, code: string) => (sent.push({ channel: "whatsapp", to, code }), { status: "sent" }),
}));
vi.mock("@/lib/notifications/sms", () => ({
  smsConfigured: () => Boolean(process.env.ARKESEL_API_KEY),
  sendSms: async (to: string, message: string) => (sent.push({ channel: "sms", to, code: message.slice(0, 6) }), { ok: true }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: lastDelivery }) }) }),
      upsert: async (row: { channel: string; sent_at: string }) => { lastDelivery = row; },
    }),
  }),
}));

const key = Buffer.from("super-secret-test-key-0123456789");
const secret = `v1,whsec_${key.toString("base64")}`;

function hookRequest(otp: string) {
  const body = JSON.stringify({ user: { phone: "233241234567" }, sms: { otp, phone: "233241234567" } });
  const ts = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", key).update(`msg_1.${ts}.${body}`).digest("base64");
  return new Request("http://x/api/auth/sms-hook", {
    method: "POST",
    body,
    headers: { "webhook-id": "msg_1", "webhook-timestamp": String(ts), "webhook-signature": `v1,${sig}` },
  });
}

async function send(otp: string) {
  const { POST } = await import("./route");
  const res = await POST(hookRequest(otp));
  await pending;
  return res.status;
}

describe("Send SMS hook channel", () => {
  beforeEach(() => {
    sent.length = 0;
    lastDelivery = null;
    process.env.SUPABASE_SMS_HOOK_SECRET = secret;
    process.env.WHATSAPP_ACCESS_TOKEN = "wa";
    process.env.ARKESEL_API_KEY = "sms";
  });
  afterEach(() => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.ARKESEL_API_KEY;
  });

  it("sends the first code by WhatsApp", async () => {
    expect(await send("111111")).toBe(200);
    expect(sent).toEqual([{ channel: "whatsapp", to: "+233241234567", code: "111111" }]);
  });

  it("sends a resend within 15 minutes by SMS", async () => {
    await send("111111");
    await send("222222");
    expect(sent.map((s) => `${s.channel}:${s.code}`)).toEqual(["whatsapp:111111", "sms:222222"]);
  });

  it("goes back to WhatsApp once the last WhatsApp code is old", async () => {
    lastDelivery = { channel: "whatsapp", sent_at: new Date(Date.now() - 20 * 60_000).toISOString() };
    await send("333333");
    expect(sent[0]?.channel).toBe("whatsapp");
  });

  it("uses SMS when WhatsApp isn't set up", async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    await send("444444");
    expect(sent).toEqual([{ channel: "sms", to: "+233241234567", code: "444444" }]);
  });

  it("keeps using WhatsApp for resends when there's no SMS provider", async () => {
    delete process.env.ARKESEL_API_KEY;
    await send("555555");
    await send("666666");
    expect(sent.map((s) => s.channel)).toEqual(["whatsapp", "whatsapp"]);
  });
});
