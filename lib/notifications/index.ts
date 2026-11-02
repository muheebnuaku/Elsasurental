import { createAdminClient } from "@/lib/supabase/admin";
import { tripTypeLabels } from "@/lib/content";
import { site } from "@/lib/site";
import { getBusiness } from "@/lib/business";
import { buildMessage, maskPhone, type MessageContext, type NotifyEvent } from "@/lib/notifications/messages";
import { sendEmail, sendSmsMessage, sendWhatsAppTemplate, type SendResult } from "@/lib/notifications/channels";
import { reportError } from "@/lib/observability";

export type { NotifyEvent } from "@/lib/notifications/messages";

/**
 * Send one event to a booking's customer: WhatsApp first, SMS if WhatsApp fails or isn't set up,
 * plus email when we have an address. Every attempt is logged in notification_log; the same
 * `${event}:${ref}:${channel}${suffix}` key is never sent twice (safe to call from retries and cron).
 */
export async function notify(event: NotifyEvent, bookingId: string, opts: { amount?: number; suffix?: string } = {}) {
  const db = createAdminClient();
  const { data: b } = await db
    .from("bookings")
    .select("id, ref_code, group_id, trip_type, start_at, pickup, contact_name, contact_phone, contact_email, driver_id, vehicle_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return;

  // Money across the whole group (multi-van bookings get one message).
  const { data: group } = b.group_id
    ? await db.from("bookings").select("total, amount_paid, status").eq("group_id", b.group_id)
    : await db.from("bookings").select("total, amount_paid, status").eq("id", b.id);
  const live = (group ?? []).filter((r) => event === "booking_cancelled" || !["cancelled", "refunded"].includes(r.status));
  const total = live.reduce((s, r) => s + Number(r.total), 0);
  const paid = live.reduce((s, r) => s + Number(r.amount_paid), 0);

  let driverName: string | null = null;
  let driverPhone: string | null = null;
  if (b.driver_id) {
    const { data: d } = await db.from("drivers").select("profiles(full_name, phone)").eq("id", b.driver_id).maybeSingle();
    const p = d?.profiles as { full_name: string | null; phone: string | null } | null;
    driverName = p?.full_name ?? null;
    driverPhone = p?.phone ?? null;
  }
  const { data: van } = b.vehicle_id ? await db.from("vehicles").select("plate").eq("id", b.vehicle_id).maybeSingle() : { data: null };
  const pickup = (b.pickup as { address?: string } | null)?.address ?? "your pick-up point";

  const ctx: MessageContext = {
    ref: b.ref_code,
    firstName: b.contact_name.split(" ")[0] ?? b.contact_name,
    trip: tripTypeLabels[b.trip_type],
    startAt: b.start_at,
    pickup,
    total,
    paid,
    balance: Math.max(0, Math.round((total - paid) * 100) / 100),
    link: `${site.url}/book/confirmation?ref=${b.ref_code}`,
    driverName,
    driverPhone,
    vanPlate: van?.plate ?? null,
    amount: opts.amount,
    business: await getBusiness(),
  };
  const msg = buildMessage(event, ctx);
  const key = (channel: string) => `${event}:${b.ref_code}:${channel}${opts.suffix ? `:${opts.suffix}` : ""}`;

  /** Claims the dedupe key first; returns false if this message was already handled. */
  const attempt = async (channel: "whatsapp" | "sms" | "email", recipient: string, send: () => Promise<SendResult>) => {
    const { error: dup } = await db.from("notification_log").insert({
      booking_id: b.id, event, channel, status: "skipped", dedupe_key: key(channel), recipient: channel === "email" ? recipient.replace(/^(.).*@/, "$1•••@") : maskPhone(recipient),
    });
    if (dup) return null; // already sent (or in progress) — never send twice
    const r = await send();
    if (r.status === "skipped" && process.env.NODE_ENV !== "production") {
      console.info(`[notify] DEV ${channel} to ${maskPhone(recipient)} (${event}): ${channel === "email" ? msg.email.subject : msg.sms}`);
    }
    await db.from("notification_log").update({ status: r.status, provider_id: r.providerId ?? null, error: r.error?.slice(0, 300) ?? null }).eq("dedupe_key", key(channel));
    return r;
  };

  const wa = await attempt("whatsapp", b.contact_phone, () => sendWhatsAppTemplate(b.contact_phone, msg.whatsapp.template, msg.whatsapp.params));
  if (!wa || wa.status !== "sent") {
    await attempt("sms", b.contact_phone, () => sendSmsMessage(b.contact_phone, msg.sms));
  }
  if (b.contact_email) await attempt("email", b.contact_email, () => sendEmail(b.contact_email!, msg.email.subject, msg.email.text));
}

/** Fire-and-forget wrapper: notification problems must never break a payment or booking. */
export async function notifySafe(event: NotifyEvent, bookingId: string, opts?: { amount?: number; suffix?: string }) {
  try {
    await notify(event, bookingId, opts);
  } catch (e) {
    reportError("notify", e, { event, bookingId });
  }
}
