import { Resend } from "resend";
import { sendSms, smsConfigured } from "@/lib/notifications/sms";

// Delivery channels. Each returns sent / failed / skipped (skipped = not configured).
export type SendResult = { status: "sent" | "failed" | "skipped"; providerId?: string; error?: string };

const GRAPH = "https://graph.facebook.com/v21.0";

export const whatsappConfigured = () => Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

/** WhatsApp Cloud API template message (templates must be approved in Meta Business Manager). */
export async function sendWhatsAppTemplate(to: string, template: string, params: string[]): Promise<SendResult> {
  if (!whatsappConfigured()) return { status: "skipped" };
  try {
    const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "template",
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "en" },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    return res.ok && data.messages?.[0]
      ? { status: "sent", providerId: data.messages[0].id }
      : { status: "failed", error: data.error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "WhatsApp request failed" };
  }
}

/**
 * Login code over WhatsApp, using an approved AUTHENTICATION template (Meta's fixed wording
 * "<code> is your verification code." with a "Copy code" button). The code fills both the body
 * and the button. Template name: WHATSAPP_OTP_TEMPLATE (default "elsasu_login_code").
 */
export async function sendWhatsAppCode(to: string, code: string): Promise<SendResult> {
  if (!whatsappConfigured()) return { status: "skipped" };
  try {
    const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "template",
        template: {
          name: process.env.WHATSAPP_OTP_TEMPLATE || "elsasu_login_code",
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "en" },
          components: [
            { type: "body", parameters: [{ type: "text", text: code }] },
            { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
          ],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    return res.ok && data.messages?.[0]
      ? { status: "sent", providerId: data.messages[0].id }
      : { status: "failed", error: data.error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "WhatsApp request failed" };
  }
}

export async function sendSmsMessage(to: string, text: string): Promise<SendResult> {
  if (!smsConfigured()) return { status: "skipped" };
  const r = await sendSms(to, text);
  return r.ok ? { status: "sent" } : { status: "failed", error: r.error };
}

export async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  if (!emailConfigured()) return { status: "skipped" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.5;color:#0a0a0a;max-width:520px">${text
      .split("\n")
      .map((l) => `<p style="margin:0 0 10px">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/(https?:\/\/\S+)/g, '<a href="$1" style="color:#c2410c">$1</a>')}</p>`)
      .join("")}</div>`;
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Elsasu Rentals <bookings@elsasu.com>",
      to,
      subject,
      text,
      html,
    });
    return error ? { status: "failed", error: error.message } : { status: "sent", providerId: data?.id };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "Email request failed" };
  }
}
