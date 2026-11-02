import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FleetCalendar, type CalBooking } from "@/components/admin/fleet-calendar";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Fleet calendar · Admin", robots: { index: false } };
const DAYS = 7;

export default async function CalendarPage({ searchParams }: PageProps<"/admin/calendar">) {
  await connection();
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const start = typeof sp.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.start) ? sp.start : today;
  const t0 = new Date(`${start}T00:00:00Z`);
  const t1 = new Date(t0.getTime() + DAYS * 86_400_000);
  const shift = (d: number) => new Date(t0.getTime() + d * 86_400_000).toISOString().slice(0, 10);

  const supabase = await createClient();
  const [{ data: vans }, { data: rows }] = await Promise.all([
    supabase.from("vehicles").select("id, name, plate, type_id, status").neq("status", "inactive").order("name"),
    supabase
      .from("bookings")
      .select("id, ref_code, vehicle_id, vehicle_type_id, start_at, end_at, status, contact_name, passengers, driver_id")
      .in("status", ["pending_payment", "confirmed", "assigned", "in_progress", "completed"])
      .lt("start_at", t1.toISOString())
      .gt("end_at", t0.toISOString())
      .order("start_at"),
  ]);

  const bookings: CalBooking[] = (rows ?? []).map((b) => ({
    id: b.id, ref: b.ref_code, vehicleId: b.vehicle_id, typeId: b.vehicle_type_id, start: b.start_at, end: b.end_at, status: b.status,
    label: `${b.contact_name.split(" ")[0]} (${b.passengers})`,
    noDriver: ["confirmed", "assigned"].includes(b.status) && !b.driver_id,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Fleet calendar</h1>
        <div className="flex items-center gap-1 text-sm">
          <Link href={`/admin/calendar?start=${shift(-DAYS)}`} className="grid size-9 place-items-center rounded-lg border bg-card" aria-label="Previous week"><ChevronLeft className="size-4" /></Link>
          <Link href="/admin/calendar" className="rounded-lg border bg-card px-3 py-1.5 font-medium">Today</Link>
          <Link href={`/admin/calendar?start=${shift(DAYS)}`} className="grid size-9 place-items-center rounded-lg border bg-card" aria-label="Next week"><ChevronRight className="size-4" /></Link>
        </div>
      </div>
      <FleetCalendar key={start} rangeStart={start} days={DAYS} bookings={bookings}
        vans={(vans ?? []).map((v) => ({ id: v.id, name: v.name, plate: v.plate, typeId: v.type_id, status: v.status }))} />
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span><span className="mr-1 inline-block size-2.5 rounded-sm bg-warning/80" />Awaiting payment</span>
        <span><span className="mr-1 inline-block size-2.5 rounded-sm bg-success/85" />Confirmed</span>
        <span><span className="mr-1 inline-block size-2.5 rounded-sm bg-brand-ink dark:bg-white" />Driver assigned</span>
        <span><span className="mr-1 inline-block size-2.5 rounded-sm bg-brand-orange" />On the road</span>
        <span><span className="mr-1 inline-block size-2.5 rounded-sm ring-2 ring-destructive" />Needs a driver</span>
        <span>Drag a booking to another van of the same size to move it.</span>
      </p>
    </div>
  );
}
