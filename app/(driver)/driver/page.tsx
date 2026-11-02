import type { Metadata } from "next";
import { connection } from "next/server";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { EmptyTrips, TripList } from "@/components/app/trip-list";

export const metadata: Metadata = { title: "My trips", robots: { index: false } };

// Driver home: trips assigned to this driver (RLS only returns their own). Full PWA arrives in Phase 2.
export default async function DriverPage() {
  await connection(); // personal, per-request page (reads the clock and the session)
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0); // Accra = UTC
  const endOfToday = new Date(startOfToday.getTime() + 86_400_000);

  const { data: trips } = await supabase
    .from("bookings")
    .select("id, ref_code, trip_type, status, start_at, passengers, pickup, dropoff, total, amount_paid, contact_name, contact_phone")
    .not("driver_id", "is", null)
    .not("status", "in", "(cancelled,refunded,completed)")
    .gte("start_at", startOfToday.toISOString())
    .order("start_at")
    .limit(50);

  const today = (trips ?? []).filter((t) => new Date(t.start_at) < endOfToday);
  const later = (trips ?? []).filter((t) => new Date(t.start_at) >= endOfToday);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Akwaaba, {user.fullName?.split(" ")[0] ?? "driver"}</h1>
        <p className="text-sm text-muted-foreground">
          {today.length ? `${today.length} trip${today.length > 1 ? "s" : ""} today.` : "No trips today."} Drive safe.
        </p>
      </div>
      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Today</h2>
        {today.length ? <TripList trips={today} showCustomer showMoney={false} /> : <EmptyTrips title="Nothing scheduled today" body="New assignments appear here automatically." />}
      </section>
      {later.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Upcoming</h2>
          <TripList trips={later} showCustomer showMoney={false} />
        </section>
      )}
    </div>
  );
}
