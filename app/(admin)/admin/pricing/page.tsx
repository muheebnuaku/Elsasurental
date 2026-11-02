import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Panel } from "@/components/admin/ui";
import { AddonForm, DestinationForm, NewAddonForm, PromoList } from "@/components/admin/pricing-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Places & extras · Admin", robots: { index: false } };

// Destinations (fixed same-day prices), extras and promo codes. Per-trip prices live on each
// vehicle type's page (Admin → Vehicles).
export default async function PricingAdminPage() {
  await connection();
  const supabase = await createClient();
  const [{ data: types }, { data: dests }, { data: addons }, { data: promos }] = await Promise.all([
    supabase.from("vehicle_types").select("id, name").order("sort_order"),
    supabase.from("destinations").select("*, destination_prices(vehicle_type_id, price)").order("est_hours"),
    supabase.from("addons").select("*").order("price"),
    supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Places &amp; extras</h1>
        <p className="text-sm text-muted-foreground">
          Changes go live immediately; existing bookings keep their price. Trip prices for each vehicle are on its page in{" "}
          <Link href="/admin/vehicles" className="font-medium text-foreground underline-offset-4 hover:underline">Vehicles</Link>.
        </p>
      </div>

      <Panel title="Destinations (same-day return from Accra)">
        <p className="mb-1 text-xs text-muted-foreground">One price per vehicle type. Leave a price empty if that vehicle doesn&apos;t go there. Untick &quot;On&quot; to hide a destination.</p>
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
        <Panel title="Extras">
          {(addons ?? []).map((a) => <AddonForm key={a.id} addon={a} />)}
          <p className="mt-3 mb-1 text-xs font-semibold text-muted-foreground uppercase">Add an extra</p>
          <NewAddonForm />
        </Panel>
        <Panel title="Promo codes">
          <PromoList promos={promos ?? []} />
        </Panel>
      </div>
    </div>
  );
}
