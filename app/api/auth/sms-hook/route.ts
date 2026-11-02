import { after } from "next/server";
import { sendSms, smsConfigured } from "@/lib/notifications/sms";
import { verifyStandardWebhook } from "@/lib/webhooks/standard";
import { reportError } from "@/lib/observability";

// Room for background retries to Arkesel (see after() below).
export const maxDuration = 60;

// Supabase Auth "Send SMS" hook: Supabase calls this with the login code; we deliver it via Arkesel/Hubtel.
// Configure in Supabase → Authentication → Hooks → Send SMS (HTTP) → this URL + the generated secret.

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

  if (!smsConfigured()) {
    if (process.env.NODE_ENV === "production") return fail(500, "SMS provider not configured");
    // Local development only: show the code in the terminal instead of sending a text.
    console.info(`[sms-hook] DEV login code for ${to}: ${otp}`);
    return Response.json({});
  }

  // Supabase gives this hook ~5 seconds, and Arkesel sometimes takes far longer to answer. So reply at
  // once and deliver in the background, retrying slow/failed attempts. A retry can only re-send the
  // same code. If every attempt fails, the customer taps "Resend code".
  after(async () => {
    let last = "";
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await sendSms(to, message, 12_000);
      if (result.ok) return;
      last = result.error;
      if (/\b(401|402|403|422)\b|invalid key|balance|sender/i.test(last)) break; // retrying won't help
    }
    reportError("sms-hook", new Error(`send failed (${to.slice(0, 7)}…): ${last}`));
  });
  return Response.json({});
}
