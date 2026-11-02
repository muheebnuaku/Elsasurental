import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifySafe, type NotifyEvent } from "@/lib/notifications";

// Runs every 15 minutes (.github/workflows/reminders.yml), sent as "Authorization: Bearer <CRON_SECRET>".
// Releases expired van holds and sends 24h / 1h trip reminders (each at most once, via notification_log).
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  const db = createAdminClient();
  const now = Date.now();

  const { data: released } = await db.rpc("release_expired_holds");

  // Windows are wide enough that a 15-minute schedule (or a missed run) still catches every trip once.
  const windows: { event: NotifyEvent; from: number; to: number }[] = [
    { event: "reminder_24h", from: 22.5 * 3600_000, to: 24.5 * 3600_000 },
    { event: "reminder_1h", from: 0.5 * 3600_000, to: 1.5 * 3600_000 },
  ];

  const sent: Record<string, number> = {};
  for (const w of windows) {
    const { data: trips } = await db
      .from("bookings")
      .select("id, group_id, created_at")
      .in("status", ["confirmed", "assigned"])
      .gte("start_at", new Date(now + w.from).toISOString())
      .lt("start_at", new Date(now + w.to).toISOString())
      .order("created_at");
    // One message per group (multi-van bookings).
    const seen = new Set<string>();
    const leads = (trips ?? []).filter((t) => {
      const key = t.group_id ?? t.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    for (const t of leads) await notifySafe(w.event, t.id);
    sent[w.event] = leads.length;
  }

  return Response.json({ releasedHolds: released ?? 0, reminders: sent });
}
