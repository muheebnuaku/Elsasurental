import { createAdminClient } from "@/lib/supabase/admin";

// Read-side availability check, used before showing a van and by the AI.
// The final word is the database exclusion constraint at booking time, so a race can never double-book.

export type Availability = Record<string, { total: number; free: number }>; // keyed by vehicle_type_id

export async function getAvailability(startAt: Date, endAt: Date): Promise<Availability> {
  const db = createAdminClient();
  // Widen the window by the longest possible buffer (10h, the DB check limit) and filter exactly below.
  const from = new Date(startAt.getTime() - 10 * 3600_000).toISOString();
  const to = new Date(endAt.getTime() + 10 * 3600_000).toISOString();

  const [vehicles, bookings] = await Promise.all([
    db.from("vehicles").select("id, type_id").in("status", ["available", "on_trip"]),
    db
      .from("bookings")
      .select("vehicle_id, start_at, end_at, buffer_minutes")
      .not("vehicle_id", "is", null)
      .not("status", "in", "(cancelled,refunded)")
      .lt("start_at", to)
      .gt("end_at", from),
  ]);
  if (vehicles.error) throw vehicles.error;
  if (bookings.error) throw bookings.error;

  const busy = new Set(
    bookings.data
      .filter((b) => {
        const bStart = new Date(b.start_at).getTime();
        const bEnd = new Date(b.end_at).getTime() + b.buffer_minutes * 60_000;
        // A new trip also needs its own turnaround after it ends (default 60 min).
        return bStart < endAt.getTime() + 60 * 60_000 && bEnd > startAt.getTime();
      })
      .map((b) => b.vehicle_id),
  );

  const out: Availability = {};
  for (const v of vehicles.data) {
    const slot = (out[v.type_id] ??= { total: 0, free: 0 });
    slot.total += 1;
    if (!busy.has(v.id)) slot.free += 1;
  }
  return out;
}

/** True if every van in the list (by type) has a free vehicle. */
export function fits(needed: { vehicleTypeId: string }[], availability: Availability) {
  const counts = new Map<string, number>();
  for (const v of needed) counts.set(v.vehicleTypeId, (counts.get(v.vehicleTypeId) ?? 0) + 1);
  return [...counts].every(([typeId, n]) => (availability[typeId]?.free ?? 0) >= n);
}
