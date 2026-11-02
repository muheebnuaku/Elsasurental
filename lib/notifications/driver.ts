import { createAdminClient } from "@/lib/supabase/admin";
import { tripTypeLabels } from "@/lib/content";
import { site } from "@/lib/site";
import { formatDateTime } from "@/lib/format";
import { formatGhanaPhone } from "@/lib/phone";
import { maskPhone } from "@/lib/notifications/messages";
import { sendSmsMessage } from "@/lib/notifications/channels";
import { reportError } from "@/lib/observability";
import type { Enums } from "@/types/supabase";

// Texts to DRIVERS (customers have their own messages in index.ts). SMS for now; WhatsApp can be
// added later. Every send is logged in notification_log.

export type DriverEvent = "trip_assigned" | "trip_removed" | "trip_cancelled";

export type DriverTrip = {
  ref: string;
  startAt: string;
  tripType: Enums<"trip_type">;
  pickup: string | null;
  dropoff: string | null;
  passengers: number;
  customerName: string;
  customerPhone: string;
  plate: string | null;
};

const link = () => `${site.url.replace(/^https?:\/\//, "")}/driver`;

export function driverMessage(event: DriverEvent, t: DriverTrip): string {
  const when = formatDateTime(t.startAt);
  switch (event) {
    case "trip_assigned": {
      const route = [t.pickup, t.dropoff].filter(Boolean).join(" to ");
      return `Elsasu: new trip ${t.ref}, ${when}. ${tripTypeLabels[t.tripType]}${route ? `: ${route}` : ""}. ${t.passengers} passenger${t.passengers === 1 ? "" : "s"}${t.plate ? `, vehicle ${t.plate}` : ""}. Customer: ${t.customerName}, ${formatGhanaPhone(t.customerPhone)}. Details: ${link()}`;
    }
    case "trip_removed":
      return `Elsasu: trip ${t.ref} on ${when} is no longer assigned to you. Your trips: ${link()}`;
    case "trip_cancelled":
      return `Elsasu: trip ${t.ref} on ${when} has been cancelled. You don't need to go. Your trips: ${link()}`;
  }
}

/** Evening summary of tomorrow's trips for one driver. */
export function driverDigest(dateLabel: string, trips: DriverTrip[]): string {
  const lines = trips.slice(0, 4).map((t) => `${t.startAt.slice(11, 16)} ${t.ref} ${t.pickup ?? ""}${t.dropoff ? ` to ${t.dropoff}` : ""} (${t.passengers})`);
  const more = trips.length > 4 ? ` +${trips.length - 4} more.` : "";
  return `Elsasu: your trips tomorrow, ${dateLabel}: ${lines.join("; ")}.${more} Details: ${link()}`;
}

const place = (p: unknown) => (p && typeof p === "object" && "address" in p ? String((p as { address: unknown }).address) : null);

async function driverPhone(driverId: string) {
  const { data } = await createAdminClient().from("drivers").select("profiles(phone)").eq("id", driverId).maybeSingle();
  return (data?.profiles as { phone: string | null } | null)?.phone ?? null;
}

/** Logs and sends one SMS; `key` makes repeats (cron, retries) safe. Returns false if already sent. */
async function sendLogged(bookingId: string | null, event: string, key: string, phone: string, text: string) {
  const db = createAdminClient();
  const { error: dup } = await db.from("notification_log").insert({
    booking_id: bookingId, event, channel: "sms", status: "skipped", dedupe_key: key, recipient: maskPhone(phone),
  });
  if (dup) return false;
  const r = await sendSmsMessage(phone, text);
  if (r.status === "skipped" && process.env.NODE_ENV !== "production") console.info(`[notify] DEV driver sms to ${maskPhone(phone)} (${event}): ${text}`);
  await db.from("notification_log").update({ status: r.status, provider_id: r.providerId ?? null, error: r.error?.slice(0, 300) ?? null }).eq("dedupe_key", key);
  return true;
}

export async function loadDriverTrip(bookingId: string): Promise<DriverTrip | null> {
  const { data: b } = await createAdminClient()
    .from("bookings")
    .select("ref_code, start_at, trip_type, pickup, dropoff, passengers, contact_name, contact_phone, vehicles(plate)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return null;
  return {
    ref: b.ref_code,
    startAt: b.start_at,
    tripType: b.trip_type,
    pickup: place(b.pickup),
    dropoff: place(b.dropoff),
    passengers: b.passengers,
    customerName: b.contact_name,
    customerPhone: b.contact_phone,
    plate: (b.vehicles as { plate: string } | null)?.plate ?? null,
  };
}

/** One message to one driver about one booking. Never throws (a text must never break a save). */
export async function notifyDriver(event: DriverEvent, bookingId: string, driverId: string) {
  try {
    const [trip, phone] = await Promise.all([loadDriverTrip(bookingId), driverPhone(driverId)]);
    if (!trip || !phone) return;
    // Admin actions happen once, but the same driver can be assigned, removed and assigned again.
    await sendLogged(bookingId, `driver_${event}`, `driver:${event}:${trip.ref}:${driverId}:${Date.now()}`, phone, driverMessage(event, trip));
  } catch (e) {
    reportError("notify.driver", e, { event, bookingId });
  }
}

/** Cancelled bookings: tell every driver assigned to any vehicle in the group, for trips still ahead. */
export async function notifyDriversOfCancellation(leadId: string) {
  try {
    const db = createAdminClient();
    const { data: lead } = await db.from("bookings").select("group_id").eq("id", leadId).maybeSingle();
    const { data: rows } = await db
      .from("bookings")
      .select("id, driver_id, start_at")
      .eq(lead?.group_id ? "group_id" : "id", lead?.group_id ?? leadId)
      .not("driver_id", "is", null);
    for (const r of rows ?? []) {
      if (r.driver_id && new Date(r.start_at).getTime() > Date.now()) await notifyDriver("trip_cancelled", r.id, r.driver_id);
    }
  } catch (e) {
    reportError("notify.driver.cancel", e, { leadId });
  }
}

/** Evening digest (cron): each driver with trips tomorrow gets one text, once per day. */
export async function sendDriverDigests(now = new Date()) {
  const db = createAdminClient();
  const start = new Date(now);
  start.setUTCHours(24, 0, 0, 0); // tomorrow 00:00 Accra (GMT)
  const end = new Date(start.getTime() + 86_400_000);
  const day = start.toISOString().slice(0, 10);
  const label = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Accra" }).format(start);

  const { data: rows } = await db
    .from("bookings")
    .select("id, driver_id, ref_code, start_at, trip_type, pickup, dropoff, passengers, contact_name, contact_phone")
    .gte("start_at", start.toISOString())
    .lt("start_at", end.toISOString())
    .in("status", ["assigned", "confirmed"])
    .not("driver_id", "is", null)
    .order("start_at");

  const byDriver = new Map<string, DriverTrip[]>();
  for (const b of rows ?? []) {
    const list = byDriver.get(b.driver_id!) ?? [];
    list.push({
      ref: b.ref_code, startAt: b.start_at, tripType: b.trip_type, pickup: place(b.pickup), dropoff: place(b.dropoff),
      passengers: b.passengers, customerName: b.contact_name, customerPhone: b.contact_phone, plate: null,
    });
    byDriver.set(b.driver_id!, list);
  }
  let sent = 0;
  for (const [driverId, trips] of byDriver) {
    const phone = await driverPhone(driverId);
    if (!phone) continue;
    if (await sendLogged(null, "driver_digest", `driver:digest:${day}:${driverId}`, phone, driverDigest(label, trips))) sent++;
  }
  return sent;
}
