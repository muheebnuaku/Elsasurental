import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ExternalLink, Plus } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { VehicleTypeForm } from "@/components/admin/vehicle-type-form";
import { VehicleForm } from "@/components/admin/fleet-forms";
import { PricingRuleForm } from "@/components/admin/pricing-forms";
import { TypeDestinationPrices } from "@/components/admin/type-destination-prices";
import { VanPhoto } from "@/components/fleet/van-photo";
import { createClient } from "@/lib/supabase/server";
import { tripTypeLabels } from "@/lib/content";
import type { TripType } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Vehicle type · Admin", robots: { index: false } };

const tripOrder: TripType[] = ["airport", "half_day", "full_day", "multi_day", "outstation", "event", "corporate_shuttle"];

const vehicleStatus: Record<string, { label: string; cls: string }> = {
  available: { label: "Available", cls: "bg-success/15 text-success" },
  on_trip: { label: "On a trip", cls: "bg-brand-orange/15 text-brand-orange-text" },
  maintenance: { label: "Maintenance", cls: "bg-warning/20" },
  inactive: { label: "Inactive", cls: "bg-muted text-muted-foreground" },
};

export default async function VehicleTypeAdminPage({ params }: PageProps<"/admin/vehicles/[id]">) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const { data: type } = await supabase.from("vehicle_types").select("*").eq("id", id).maybeSingle();
  if (!type) notFound();

  const [{ data: types }, { data: vehicles }, { data: rules }, { data: dests }, { data: destPrices }] = await Promise.all([
    supabase.from("vehicle_types").select("id, name, seats, category").order("sort_order"),
    supabase.from("vehicles").select("*").eq("type_id", id).order("name"),
    supabase.from("pricing_rules").select("*").eq("vehicle_type_id", id).eq("active", true),
    supabase.from("destinations").select("id, name, region").order("est_hours"),
    supabase.from("destination_prices").select("destination_id, price").eq("vehicle_type_id", id),
  ]);
  const typeOpts = types ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/vehicles" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All vehicles
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{type.name}</h1>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", type.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
            {type.active ? "On website" : "Hidden"}
          </span>
          {type.active && (
            <Link href={`/fleet/${type.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-medium text-brand-orange-text hover:underline">
              View on website <ExternalLink className="size-3.5" />
            </Link>
          )}
        </div>
      </div>

      <Panel title="Details">
        <VehicleTypeForm type={type} />
      </Panel>

      <Panel title={`Vehicles in this type (${vehicles?.length ?? 0})`}>
        {!vehicles?.length && (
          <p className="mb-3 rounded-xl bg-warning/15 px-3 py-2 text-sm">
            No vehicles yet. Customers can see this type, but bookings can&apos;t be confirmed until you add at least one vehicle.
          </p>
        )}
        <ul className="grid gap-3 md:grid-cols-2">
          {(vehicles ?? []).map((v) => (
            <li key={v.id} className="overflow-hidden rounded-xl border">
              <div className="flex gap-3 p-3">
                <VanPhoto photos={v.photos} seats={type.seats} category={type.category} alt={v.name} className="aspect-[4/3] w-24 shrink-0 rounded-lg" sizes="96px" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{v.name}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", vehicleStatus[v.status]?.cls)}>{vehicleStatus[v.status]?.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{v.plate}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.current_mileage.toLocaleString()} km{v.year ? ` · ${v.year}` : ""}{v.colour ? ` · ${v.colour}` : ""} · {v.photos.length} photo{v.photos.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <details className="border-t">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium hover:bg-muted">Edit, photos &amp; videos</summary>
                <div className="p-3 pt-1"><VehicleForm vehicle={v} types={typeOpts} /></div>
              </details>
            </li>
          ))}
        </ul>
        <details className="mt-3 rounded-xl border" open={!vehicles?.length}>
          <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-sm font-semibold hover:bg-muted"><Plus className="size-4" /> Add a vehicle</summary>
          <div className="p-3 pt-1"><VehicleForm types={typeOpts} defaultTypeId={type.id} /></div>
        </details>
      </Panel>

      <Panel title="Prices by trip">
        <p className="mb-1 text-xs text-muted-foreground">Multi-day: base, km and hours are per day. Outstation: used for routes without a fixed destination price.</p>
        {tripOrder.map((trip) => {
          const r = rules?.find((x) => x.trip_type === trip);
          return r ? <PricingRuleForm key={r.id} rule={{ ...r, trip: tripTypeLabels[trip] }} /> : null;
        })}
        {!rules?.length && <p className="text-sm text-muted-foreground">No prices yet.</p>}
      </Panel>

      <Panel title="Destination prices (same-day return from Accra)">
        <TypeDestinationPrices
          typeId={type.id}
          rows={(dests ?? []).map((d) => ({ ...d, price: destPrices?.find((p) => p.destination_id === d.id)?.price ?? null }))}
        />
      </Panel>
    </div>
  );
}
