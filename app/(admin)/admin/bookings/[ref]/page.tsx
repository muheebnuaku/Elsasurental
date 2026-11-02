import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ChevronLeft, Mail, MapPin, Phone, Users } from "lucide-react";
import { Panel, StatusBadge } from "@/components/admin/ui";
import { CancelPanel, DispatchForm, NotesForm, PaymentPanel, StatusButtons } from "@/components/admin/booking-panels";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { createClient } from "@/lib/supabase/server";
import { refundFor } from "@/lib/booking/cancellation";
import { place } from "@/lib/booking/details";
import { tripTypeLabels } from "@/lib/content";
import { formatDateTime, formatMoney } from "@/lib/format";
import { formatGhanaPhone } from "@/lib/phone";
import type { BookingStatus } from "@/lib/booking-status";

export const metadata: Metadata = { title: "Booking · Admin", robots: { index: false } };

const LIVE: BookingStatus[] = ["pending_payment", "confirmed", "assigned", "in_progress"];

export default async function AdminBookingPage({ params }: PageProps<"/admin/bookings/[ref]">) {
  await connection();
  const { ref } = await params;
  const supabase = await createClient();

  const { data: b } = await supabase.from("bookings").select("*").eq("ref_code", ref).maybeSingle();
  if (!b) notFound();

  const groupQ = b.group_id
    ? supabase.from("bookings").select("id, ref_code, status, passengers, total, amount_paid, vehicle_id, created_at").eq("group_id", b.group_id).order("created_at")
    : supabase.from("bookings").select("id, ref_code, status, passengers, total, amount_paid, vehicle_id, created_at").eq("id", b.id);
  const { data: group = [] } = await groupQ;
  const leadId = group?.[0]?.id ?? b.id;

  // Who is free for this booking's time window (buffer included)?
  const from = new Date(new Date(b.start_at).getTime() - b.buffer_minutes * 60_000).toISOString();
  const to = new Date(new Date(b.end_at).getTime() + b.buffer_minutes * 60_000).toISOString();
  const [vehicles, drivers, overlaps, payments, notes, addons] = await Promise.all([
    supabase.from("vehicles").select("id, name, plate, type_id, status").eq("type_id", b.vehicle_type_id).neq("status", "inactive").order("name"),
    supabase.from("drivers").select("id, is_active, licence_expiry, profiles(full_name, phone)").eq("is_active", true),
    supabase.from("bookings").select("vehicle_id, driver_id").neq("id", b.id).in("status", LIVE).lt("start_at", to).gt("end_at", from),
    supabase.from("payments").select("reference, kind, amount, status, method, paid_at, created_at, provider").eq("booking_id", leadId).order("created_at", { ascending: false }),
    supabase.from("notification_log").select("event, channel, status, recipient, error, created_at").eq("booking_id", leadId).order("created_at", { ascending: false }).limit(20),
    supabase.from("booking_addons").select("qty, unit_price, addons(name)").eq("booking_id", b.id),
  ]);
  const busyVans = new Set((overlaps.data ?? []).map((o) => o.vehicle_id));
  const busyDrivers = new Set((overlaps.data ?? []).map((o) => o.driver_id));
  const tripDay = b.start_at.slice(0, 10);

  const vanOptions = (vehicles.data ?? []).map((v) => ({
    id: v.id,
    label: `${v.name} · ${v.plate}${v.status === "maintenance" ? " · in maintenance" : ""}`,
    busy: (busyVans.has(v.id) || v.status === "maintenance") && v.id !== b.vehicle_id,
  }));
  const driverOptions = (drivers.data ?? []).map((d) => {
    const p = d.profiles as { full_name: string | null; phone: string | null } | null;
    const expired = d.licence_expiry < tripDay;
    return {
      id: d.id,
      label: `${p?.full_name ?? "Driver"}${expired ? " · licence expired" : ""}`,
      busy: (busyDrivers.has(d.id) || expired) && d.id !== b.driver_id,
    };
  });

  const live = (group ?? []).filter((g) => !["cancelled", "refunded"].includes(g.status));
  const total = live.reduce((s, g) => s + Number(g.total), 0);
  const paid = live.reduce((s, g) => s + Number(g.amount_paid), 0);
  const balance = Math.max(0, Math.round((total - paid) * 100) / 100);
  const policy = refundFor(b.start_at, paid);
  const lines = ((b.quote_snapshot ?? {}) as { lines?: { label: string; amount: number }[] }).lines ?? [];
  const stops = Array.isArray(b.stops) ? (b.stops as { address?: string }[]).map((s) => s.address).filter(Boolean) : [];

  return (
    <div className="space-y-4">
      <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> Bookings</Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">{b.ref_code}</h1>
        <StatusBadge status={b.status} />
        <span className="text-xs text-muted-foreground uppercase">via {b.source} · created {formatDateTime(b.created_at)}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <Panel title="Trip">
            <p className="font-semibold">{tripTypeLabels[b.trip_type]} · {formatDateTime(b.start_at)} → {formatDateTime(b.end_at)}</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-brand-orange" /> {place(b.pickup) ?? "—"}</li>
              {stops.map((s, i) => <li key={i} className="flex gap-2 pl-6 text-muted-foreground">via {s}</li>)}
              {place(b.dropoff) && <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0" /> {place(b.dropoff)}</li>}
              <li className="flex gap-2"><Users className="mt-0.5 size-4 shrink-0 text-brand-orange" /> {b.passengers} passengers · {b.luggage} bags{b.distance_km ? ` · ≈${b.distance_km} km` : ""}</li>
            </ul>
            {(addons.data ?? []).length > 0 && <p className="mt-2 text-sm text-muted-foreground">Add-ons: {(addons.data ?? []).map((a) => `${(a.addons as { name: string } | null)?.name} ×${a.qty}`).join(", ")}</p>}
            {b.notes && <p className="mt-2 rounded-lg bg-muted p-2.5 text-sm">“{b.notes}”</p>}
            {(group ?? []).length > 1 && (
              <p className="mt-3 text-sm">Group of {(group ?? []).length} vans: {(group ?? []).map((g) => (
                <Link key={g.id} href={`/admin/bookings/${g.ref_code}`} className={`mr-2 font-mono ${g.ref_code === b.ref_code ? "font-semibold" : "underline"}`}>{g.ref_code}</Link>
              ))}</p>
            )}
          </Panel>

          <Panel title="Customer">
            <p className="font-semibold">{b.contact_name}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <a href={`tel:${b.contact_phone}`} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 hover:bg-muted"><Phone className="size-4" /> {formatGhanaPhone(b.contact_phone)}</a>
              <a href={`https://wa.me/${b.contact_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 hover:bg-muted"><WhatsAppIcon className="size-4" /> WhatsApp</a>
              {b.contact_email && <a href={`mailto:${b.contact_email}`} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 hover:bg-muted"><Mail className="size-4" /> {b.contact_email}</a>}
            </div>
          </Panel>

          <Panel title="Money">
            <ul className="space-y-1 text-sm">
              {lines.map((l, i) => <li key={i} className="flex justify-between gap-3"><span className="text-muted-foreground">{l.label}</span><span className="tabular-nums">{formatMoney(l.amount)}</span></li>)}
            </ul>
            <dl className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center text-sm">
              <div><dt className="text-xs text-muted-foreground">Total</dt><dd className="font-semibold tabular-nums">{formatMoney(total)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Paid</dt><dd className="font-semibold tabular-nums">{formatMoney(paid)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Balance</dt><dd className="font-semibold tabular-nums text-brand-orange-text">{formatMoney(balance)}</dd></div>
            </dl>
            {(payments.data ?? []).length > 0 && (
              <ul className="mt-3 divide-y rounded-xl border text-sm">
                {(payments.data ?? []).map((p) => (
                  <li key={p.reference} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0">
                      <span className="font-medium capitalize">{p.kind}</span> · <span className="text-muted-foreground">{p.method ?? p.provider} · {formatDateTime(p.paid_at ?? p.created_at)}</span>
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">{p.reference}</span>
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      {p.kind === "refund" ? "−" : ""}{formatMoney(Number(p.amount))}
                      <span className="block text-[11px] text-muted-foreground">{p.status}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Messages sent">
            {(notes.data ?? []).length ? (
              <ul className="space-y-1 text-sm">
                {(notes.data ?? []).map((n, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-2">
                    <span>{n.event.replace(/_/g, " ")} · {n.channel} <span className="text-muted-foreground">{n.recipient}</span></span>
                    <span className={n.status === "sent" ? "text-success" : n.status === "failed" ? "text-destructive" : "text-muted-foreground"}>{n.status} · {formatDateTime(n.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No messages yet.</p>}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Dispatch">
            <DispatchForm refCode={b.ref_code} vans={vanOptions} drivers={driverOptions} vehicleId={b.vehicle_id} driverId={b.driver_id} locked={!["pending_payment", "confirmed", "assigned"].includes(b.status)} />
            <div className="mt-3"><StatusButtons refCode={b.ref_code} status={b.status} /></div>
          </Panel>
          {LIVE.includes(b.status) && balance > 0 && (
            <Panel title="Take payment">
              <PaymentPanel refCode={b.ref_code} balance={balance} phone={b.contact_phone} active />
            </Panel>
          )}
          <Panel title="Notes">
            <NotesForm refCode={b.ref_code} notes={b.admin_notes ?? ""} />
          </Panel>
          {["pending_payment", "confirmed", "assigned"].includes(b.status) && (
            <Panel title="Cancel">
              <CancelPanel refCode={b.ref_code} policyRefund={policy.amount} paid={paid} />
            </Panel>
          )}
          {b.cancel_reason && <p className="rounded-xl bg-destructive/5 p-3 text-sm">Cancelled: {b.cancel_reason}</p>}
        </div>
      </div>
    </div>
  );
}
