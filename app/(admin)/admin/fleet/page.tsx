import type { Metadata } from "next";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { DriverForm, VehicleForm } from "@/components/admin/fleet-forms";
import { VanPhoto } from "@/components/fleet/van-photo";
import { createClient } from "@/lib/supabase/server";
import { formatGhanaPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Fleet · Admin", robots: { index: false } };

const vanStatus: Record<string, { label: string; cls: string }> = {
  available: { label: "Available", cls: "bg-success/15 text-success" },
  on_trip: { label: "On a trip", cls: "bg-brand-orange/15 text-brand-orange-text" },
  maintenance: { label: "Maintenance", cls: "bg-warning/20" },
  inactive: { label: "Inactive", cls: "bg-muted text-muted-foreground" },
};

export default async function FleetAdminPage() {
  await connection();
  const supabase = await createClient();
  const [{ data: types }, { data: vehicles }, { data: drivers }] = await Promise.all([
    supabase.from("vehicle_types").select("id, name, seats").order("sort_order"),
    supabase.from("vehicles").select("*").order("name"),
    supabase.from("drivers").select("id, licence_no, licence_expiry, is_active, rating, profiles(full_name, phone)").order("created_at"),
  ]);
  const typeOpts = (types ?? []).map((t) => ({ id: t.id, name: t.name }));
  const seatsOf = (typeId: string) => types?.find((t) => t.id === typeId)?.seats ?? 8;
  const soon = dateInDays(30);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Fleet</h1>

      <Panel title={`Vans (${vehicles?.length ?? 0})`}>
        <ul className="grid gap-3 md:grid-cols-2">
          {(vehicles ?? []).map((v) => (
            <li key={v.id} className="overflow-hidden rounded-xl border">
              <div className="flex gap-3 p-3">
                <VanPhoto photos={v.photos} seats={seatsOf(v.type_id)} alt={v.name} className="aspect-[4/3] w-24 shrink-0 rounded-lg" sizes="96px" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{v.name}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", vanStatus[v.status]?.cls)}>{vanStatus[v.status]?.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{v.plate} · {typeOpts.find((t) => t.id === v.type_id)?.name}</p>
                  <p className="text-xs text-muted-foreground">{v.current_mileage.toLocaleString()} km{v.year ? ` · ${v.year}` : ""}{v.colour ? ` · ${v.colour}` : ""} · {v.photos.length} photo{v.photos.length === 1 ? "" : "s"}</p>
                </div>
              </div>
              <details className="border-t">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium hover:bg-muted">Edit</summary>
                <div className="p-3 pt-1"><VehicleForm vehicle={v} types={typeOpts} /></div>
              </details>
            </li>
          ))}
        </ul>
        <details className="mt-3 rounded-xl border">
          <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-sm font-semibold hover:bg-muted"><Plus className="size-4" /> Add a van</summary>
          <div className="p-3 pt-1"><VehicleForm types={typeOpts} /></div>
        </details>
      </Panel>

      <Panel title={`Drivers (${drivers?.length ?? 0})`}>
        <ul className="grid gap-3 md:grid-cols-2">
          {(drivers ?? []).map((d) => {
            const p = d.profiles as { full_name: string | null; phone: string | null } | null;
            const expiring = d.licence_expiry <= soon;
            return (
              <li key={d.id} className="rounded-xl border">
                <div className="flex items-start justify-between gap-2 p-3">
                  <div>
                    <p className="font-semibold">{p?.full_name ?? "Driver"}</p>
                    <p className="text-sm text-muted-foreground">{p?.phone ? formatGhanaPhone(p.phone) : "—"}{d.rating ? ` · ★ ${d.rating}` : ""}</p>
                    <p className={cn("text-xs", expiring ? "font-medium text-destructive" : "text-muted-foreground")}>
                      Licence {d.licence_no} · expires {d.licence_expiry}{expiring ? " (renew soon)" : ""}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", d.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>{d.is_active ? "Active" : "Inactive"}</span>
                </div>
                <details className="border-t">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium hover:bg-muted">Edit</summary>
                  <div className="p-3 pt-1">
                    <DriverForm driver={{ id: d.id, full_name: p?.full_name ?? "", phone: p?.phone ? formatGhanaPhone(p.phone) : "", licence_no: d.licence_no, licence_expiry: d.licence_expiry, is_active: d.is_active }} />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
        <details className="mt-3 rounded-xl border">
          <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-sm font-semibold hover:bg-muted"><Plus className="size-4" /> Add a driver</summary>
          <div className="p-3 pt-1"><DriverForm /></div>
        </details>
      </Panel>
    </div>
  );
}

/** YYYY-MM-DD, n days from now (licence-expiry warnings). */
function dateInDays(n: number, now = Date.now()) {
  return new Date(now + n * 86_400_000).toISOString().slice(0, 10);
}
