import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, Plus, Users, Briefcase } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { VehicleTypeForm } from "@/components/admin/vehicle-type-form";
import { VanPhoto } from "@/components/fleet/van-photo";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Vehicles · Admin", robots: { index: false } };

// Every vehicle type the website offers (including hidden ones), with its vehicles and lowest price.
export default async function VehiclesAdminPage() {
  await connection();
  const supabase = await createClient();
  const [{ data: types }, { data: vehicles }, { data: rules }] = await Promise.all([
    supabase.from("vehicle_types").select("*").order("sort_order"),
    supabase.from("vehicles").select("id, type_id, status, photos"),
    supabase.from("pricing_rules").select("vehicle_type_id, base_price").eq("active", true),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vehicles</h1>
        <p className="text-sm text-muted-foreground">What customers can book. Open a vehicle type to edit its details, prices and the vehicles (with plates) in it.</p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(types ?? []).map((t) => {
          const mine = (vehicles ?? []).filter((v) => v.type_id === t.id);
          const inService = mine.filter((v) => v.status !== "inactive").length;
          const prices = (rules ?? []).filter((r) => r.vehicle_type_id === t.id).map((r) => r.base_price);
          return (
            <li key={t.id}>
              <Link href={`/admin/vehicles/${t.id}`} className="group block overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md">
                <div className="relative">
                  <VanPhoto photos={mine.flatMap((v) => v.photos)} seats={t.seats} category={t.category} alt={t.name} className="aspect-[16/9]" sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw" />
                  <span className={cn("absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm", t.active ? "bg-success text-white" : "bg-background/90 text-muted-foreground")}>
                    {t.active ? "On website" : "Hidden"}
                  </span>
                  <span className="absolute top-2.5 right-2.5 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold uppercase shadow-sm">{t.category}</span>
                </div>
                <div className="flex items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {t.seats}</span>
                      <span className="inline-flex items-center gap-1"><Briefcase className="size-3.5" /> {t.luggage_capacity}</span>
                      <span className={cn(inService === 0 && "font-medium text-destructive")}>{inService} vehicle{inService === 1 ? "" : "s"} in service</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">from</p>
                    <p className="font-semibold tabular-nums">{prices.length ? formatMoney(Math.min(...prices)) : "—"}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <Panel title="Add a vehicle type">
        <p className="-mt-1 mb-3 flex items-center gap-1.5 text-sm text-muted-foreground"><Plus className="size-4" /> For example a Land Cruiser. Its prices start as a copy of the type you choose.</p>
        <VehicleTypeForm copyOptions={(types ?? []).map((t) => ({ id: t.id, name: t.name }))} />
      </Panel>
    </div>
  );
}
