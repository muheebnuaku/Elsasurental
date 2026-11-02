import type { Metadata } from "next";
import { connection } from "next/server";
import { AlertCircle, CalendarClock, Car, UserRoundCheck, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyTrips, TripList } from "@/components/app/trip-list";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

// Admin overview with live numbers (admin RLS sees everything). Full dashboard: Phase 1, Step 11.
export default async function AdminPage() {
  await connection(); // personal, per-request page (reads the clock and the session)
  const supabase = await createClient();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86_400_000);
  const live = "(pending_payment,confirmed,assigned,in_progress)";

  const [today, unassigned, unpaid, vans, drivers, recent] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }).gte("start_at", start.toISOString()).lt("start_at", end.toISOString()).filter("status", "in", live),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed").is("driver_id", null),
    supabase.from("bookings").select("total, amount_paid").in("status", ["confirmed", "assigned", "in_progress"]),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).in("status", ["available", "on_trip"]),
    supabase.from("drivers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("bookings")
      .select("id, ref_code, trip_type, status, start_at, passengers, pickup, dropoff, total, amount_paid, contact_name, contact_phone")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const balance = (unpaid.data ?? []).reduce((s, b) => s + Math.max(0, b.total - b.amount_paid), 0);
  const stats = [
    { icon: CalendarClock, label: "Trips today", value: String(today.count ?? 0) },
    { icon: AlertCircle, label: "Need a driver", value: String(unassigned.count ?? 0), alert: (unassigned.count ?? 0) > 0 },
    { icon: Wallet, label: "Balances due", value: formatMoney(balance) },
    { icon: Car, label: "Vans in service", value: String(vans.count ?? 0) },
    { icon: UserRoundCheck, label: "Active drivers", value: String(drivers.count ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(({ icon: Icon, label, value, alert }) => (
          <li key={label} className="relative rounded-2xl border bg-card p-4">
            <Icon className={alert ? "size-5 text-destructive" : "size-5 text-brand-orange"} />
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </li>
        ))}
      </ul>
      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Latest bookings</h2>
        {recent.data?.length ? (
          <TripList trips={recent.data} showCustomer hrefBase="/admin/bookings/" />
        ) : (
          <EmptyTrips title="No bookings yet" body="New bookings from the website, WhatsApp and the assistant will show up here." />
        )}
      </section>
    </div>
  );
}
