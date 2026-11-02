import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AlertCircle, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, fieldCls } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/server";
import { bookingStatus, type BookingStatus } from "@/lib/booking-status";
import { tripTypeLabels } from "@/lib/content";
import { formatDateTime, formatMoney } from "@/lib/format";
import { formatGhanaPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Bookings · Admin", robots: { index: false } };
const PAGE = 25;

export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  await connection();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = str("q").trim();
  const status = str("status") as BookingStatus | "";
  const when = str("when") || "upcoming";
  const page = Math.max(1, Number(str("page")) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select("id, ref_code, trip_type, status, start_at, passengers, contact_name, contact_phone, total, amount_paid, driver_id, vehicle_id, source, pickup", { count: "exact" });

  const now = new Date().toISOString();
  if (when === "upcoming") query = query.gte("start_at", now).order("start_at", { ascending: true });
  else if (when === "past") query = query.lt("start_at", now).order("start_at", { ascending: false });
  else query = query.order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ");
    query = query.or(`ref_code.ilike.%${safe}%,contact_name.ilike.%${safe}%,contact_phone.ilike.%${safe.replace(/^0/, "")}%`);
  }
  const { data: rows, count } = await query.range((page - 1) * PAGE, page * PAGE - 1);
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: number) => {
    const u = new URLSearchParams({ ...(q && { q }), ...(status && { status }), when, page: String(p) });
    return `/admin/bookings?${u}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
        <Button asChild variant="accent" size="lg" className="h-9 rounded-lg">
          <Link href="/admin/bookings/new"><Plus /> Phone booking</Link>
        </Button>
      </div>

      <form className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_auto_auto]" role="search">
        <div className="relative col-span-2 sm:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={q} placeholder="Ref, name or phone" aria-label="Search bookings" className={`${fieldCls} pl-8`} />
        </div>
        <select name="status" defaultValue={status} aria-label="Status" className={fieldCls}>
          <option value="">All statuses</option>
          {Object.entries(bookingStatus).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select name="when" defaultValue={when} aria-label="When" className={fieldCls}>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
          <option value="all">All (newest first)</option>
        </select>
        <Button type="submit" variant="default" size="lg" className="h-9 rounded-lg">Filter</Button>
      </form>

      {!rows?.length ? (
        <p className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">No bookings match.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary/70 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Ref</th>
                  <th className="px-3 py-2.5 font-semibold">When</th>
                  <th className="px-3 py-2.5 font-semibold">Customer</th>
                  <th className="px-3 py-2.5 font-semibold">Trip</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Paid / total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((b) => (
                  <tr key={b.id} className="relative hover:bg-muted/50">
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/bookings/${b.ref_code}`} className="font-mono font-semibold after:absolute after:inset-0">{b.ref_code}</Link>
                      {b.source !== "web" && <span className="ml-1.5 text-[10px] text-muted-foreground uppercase">{b.source}</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatDateTime(b.start_at)}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{b.contact_name}</p>
                      <p className="text-xs text-muted-foreground">{formatGhanaPhone(b.contact_phone)}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      {tripTypeLabels[b.trip_type]} · {b.passengers} pax
                      {["confirmed", "assigned"].includes(b.status) && !b.driver_id && (
                        <span className="ml-1.5 inline-flex items-center gap-1 text-xs font-medium text-destructive"><AlertCircle className="size-3.5" /> No driver</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={b.status} /></td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(b.amount_paid)} / {formatMoney(b.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone cards */}
          <ul className="space-y-2 md:hidden">
            {rows.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/bookings/${b.ref_code}`} className="block rounded-2xl border bg-card p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{b.ref_code}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-1 text-sm font-medium">{b.contact_name} · {b.passengers} pax</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(b.start_at)} · {tripTypeLabels[b.trip_type]}</p>
                  <p className="mt-1 flex justify-between text-xs">
                    <span className="tabular-nums">{formatMoney(b.amount_paid)} / {formatMoney(b.total)}</span>
                    {["confirmed", "assigned"].includes(b.status) && !b.driver_id && <span className="font-medium text-destructive">No driver</span>}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} booking{total === 1 ? "" : "s"}</span>
            <div className="flex items-center gap-1">
              {page > 1 && <Link href={link(page - 1)} className="grid size-8 place-items-center rounded-lg border bg-card" aria-label="Previous page"><ChevronLeft className="size-4" /></Link>}
              <span className="px-2">Page {page} of {pages}</span>
              {page < pages && <Link href={link(page + 1)} className="grid size-8 place-items-center rounded-lg border bg-card" aria-label="Next page"><ChevronRight className="size-4" /></Link>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
