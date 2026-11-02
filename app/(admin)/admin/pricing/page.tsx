import type { Metadata } from "next";
import { connection } from "next/server";
import { Panel } from "@/components/admin/ui";
import { AddonForm, DestinationForm, PricingRuleForm, PromoList } from "@/components/admin/pricing-forms";
import { createClient } from "@/lib/supabase/server";
import { tripTypeLabels } from "@/lib/content";
import type { TripType } from "@/lib/catalog";

export const metadata: Metadata = { title: "Pricing · Admin", robots: { index: false } };
const order: TripType[] = ["airport", "half_day", "full_day", "multi_day", "outstation", "event", "corporate_shuttle"];

export default async function PricingAdminPage() {
  await connection();
  const supabase = await createClient();
  const [{ data: types }, { data: rules }, { data: dests }, { data: addons }, { data: promos }] = await Promise.all([
    supabase.from("vehicle_types").select("id, name").order("sort_order"),
    supabase.from("pricing_rules").select("*").eq("active", true),
    supabase.from("destinations").select("*, destination_prices(vehicle_type_id, price)").order("est_hours"),
    supabase.from("addons").select("*").order("price"),
    supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pricing</h1>
        <p className="text-sm text-muted-foreground">Changes go live on the website immediately. Existing bookings keep the price they were booked at.</p>
      </div>

      {(types ?? []).map((t) => (
        <Panel key={t.id} title={`${t.name} — prices by trip`}>
          <p className="mb-1 text-xs text-muted-foreground">Multi-day: base, km and hours are per day. Outstation: used for routes without a fixed destination price.</p>
          {order.map((trip) => {
            const r = rules?.find((x) => x.vehicle_type_id === t.id && x.trip_type === trip);
            return r ? <PricingRuleForm key={r.id} rule={{ ...r, trip: tripTypeLabels[trip] }} /> : null;
          })}
        </Panel>
      ))}

      <Panel title="Fixed-price destinations (same-day return from Accra)">
        <p className="mb-1 text-xs text-muted-foreground">One price per vehicle type. Leave a price empty if that vehicle doesn&apos;t go there.</p>
        {(dests ?? []).map(({ destination_prices, ...d }) => (
          <DestinationForm
            key={d.id}
            types={types ?? []}
            dest={{ ...d, prices: Object.fromEntries(destination_prices.map((p) => [p.vehicle_type_id, p.price])) }}
          />
        ))}
        <p className="mt-3 text-xs font-semibold text-muted-foreground uppercase">Add a destination</p>
        <DestinationForm types={types ?? []} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Add-ons">
          {(addons ?? []).map((a) => <AddonForm key={a.id} addon={a} />)}
        </Panel>
        <Panel title="Promo codes">
          <PromoList promos={promos ?? []} />
        </Panel>
      </div>
    </div>
  );
}
