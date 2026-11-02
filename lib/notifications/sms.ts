// Ghana SMS via Arkesel (default) or Hubtel. Used for login codes now, booking notifications in Step 9.
// TODO(confirm): Arkesel vs Hubtel, and the registered sender ID ("Elsasu" must be approved by the provider).

export type SmsResult = { ok: true; provider: string } | { ok: false; error: string };

export function smsConfigured() {
  const p = process.env.SMS_PROVIDER ?? "arkesel";
  return p === "hubtel" ? Boolean(process.env.HUBTEL_CLIENT_ID && process.env.HUBTEL_CLIENT_SECRET) : Boolean(process.env.ARKESEL_API_KEY);
}

/** `to` in E.164 (+233…). Never logs the message body (it may contain a login code). */
export async function sendSms(to: string, message: string): Promise<SmsResult> {
  const provider = process.env.SMS_PROVIDER ?? "arkesel";
  const sender = process.env.SMS_SENDER_ID ?? "Elsasu";
  const msisdn = to.replace(/^\+/, "");

  try {
    if (provider === "hubtel") {
      const url = new URL("https://smsc.hubtel.com/v1/messages/send");
      url.searchParams.set("clientid", process.env.HUBTEL_CLIENT_ID ?? "");
      url.searchParams.set("clientsecret", process.env.HUBTEL_CLIENT_SECRET ?? "");
      url.searchParams.set("from", sender);
      url.searchParams.set("to", msisdn);
      url.searchParams.set("content", message);
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      return res.ok ? { ok: true, provider } : { ok: false, error: `Hubtel ${res.status}` };
    }

    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": process.env.ARKESEL_API_KEY ?? "" },
      body: JSON.stringify({ sender, message, recipients: [msisdn] }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { status?: string; message?: string };
    return res.ok && data.status === "success" ? { ok: true, provider } : { ok: false, error: `Arkesel ${res.status} ${data.message ?? ""}`.trim() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "SMS request failed" };
  }
}
