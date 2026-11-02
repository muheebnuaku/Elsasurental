import { after } from "next/server";
import { sendSms, smsConfigured } from "@/lib/notifications/sms";
import { sendWhatsAppCode, whatsappConfigured } from "@/lib/notifications/channels";
import { verifyStandardWebhook } from "@/lib/webhooks/standard";
import { reportError } from "@/lib/observability";
import { createAdminClient } from "@/lib/supabase/admin";

// Room for background retries (see after() below).
export const maxDuration = 60;

// Supabase Auth "Send SMS" hook: Supabase calls this with the login code and we deliver it ourselves.
// WhatsApp first (fast, and most customers use it); SMS (Arkesel/Hubtel) if WhatsApp isn't set up or the
// number isn't on WhatsApp. Configure in Supabase → Authentication → Hooks → Send SMS (HTTP).

// sms.phone is where the code goes. It differs from user.phone when a signed-in (e.g. Google) account
// is adding a number (phone_change), so prefer it.
type HookPayload = { user?: { phone?: string }; sms?: { otp?: string; phone?: string } };

const fail = (status: number, message: string) =>
  Response.json({ error: { http_code: status, message } }, { status });

export async function POST(req: Request) {
  const secret = process.env.SUPABASE_SMS_HOOK_SECRET;
  if (!secret) return fail(500, "SMS hook secret not configured");

  const body = await req.text();
  if (!verifyStandardWebhook(secret, req.headers, body)) return fail(401, "Invalid signature");

  const payload = JSON.parse(body) as HookPayload;
  const phone = payload.sms?.phone || payload.user?.phone;
  const otp = payload.sms?.otp;
  if (!phone || !otp) return fail(400, "Missing phone or code");

  const to = `+${phone.replace(/^\+/, "")}`;
  const message = `${otp} is your Elsasu login code. It expires in 10 minutes. Never share it with anyone.`;

  if (!whatsappConfigured() && !smsConfigured()) {
    if (process.env.NODE_ENV === "production") return fail(500, "No WhatsApp or SMS provider configured");
    // Local development only: show the code in the terminal instead of sending it.
    console.info(`[sms-hook] DEV login code for ${to}: ${otp}`);
    return Response.json({});
  }

  // Supabase gives this hook ~5 seconds and providers can be slower, so reply at once and deliver in
  // the background. A retry can only re-send the same code; if everything fails, "Resend code" works.
  after(async () => {
    const db = createAdminClient();
    const errors: string[] = [];
    const sentBy = (channel: "whatsapp" | "sms") =>
      db.from("otp_deliveries").upsert({ phone: to, channel, sent_at: new Date().toISOString() });

    // Meta accepts a message even when the number isn't on WhatsApp (that fails later), so we can't
    // detect it here. Instead: a resend within 15 minutes of a WhatsApp code goes by SMS.
    const { data: prev } = await db.from("otp_deliveries").select("channel, sent_at").eq("phone", to).maybeSingle();
    const resendAfterWhatsApp = prev?.channel === "whatsapp" && Date.now() - new Date(prev.sent_at).getTime() < 15 * 60_000;

    if (whatsappConfigured() && !(resendAfterWhatsApp && smsConfigured())) {
      const wa = await sendWhatsAppCode(to, otp);
      if (wa.status === "sent") return void (await sentBy("whatsapp"));
      errors.push(`WhatsApp: ${wa.status === "failed" ? wa.error : wa.status}`);
    }

    if (smsConfigured()) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const result = await sendSms(to, message, 12_000);
        if (result.ok) return void (await sentBy("sms"));
        errors.push(`SMS: ${result.error}`);
        if (/\b(401|402|403|422)\b|invalid key|balance|sender/i.test(result.error)) break; // retrying won't help
      }
    }

    reportError("sms-hook", new Error(`code not delivered (${to.slice(0, 7)}…): ${errors.join(" | ")}`));
  });
  return Response.json({});
}
