import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Tables, Enums } from "@/types/supabase";

// Public catalogue, cached for an hour. Admin edits will call revalidateTag("catalog").

export type VehicleType = Tables<"vehicle_types">;
export type Vehicle = Tables<"vehicles">;
export type PricingRule = Tables<"pricing_rules">;
/** A destination with its fixed same-day-return price per vehicle type (vehicle_type_id → GH₵). */
export type Destination = Tables<"destinations"> & { prices: Record<string, number> };
export type Addon = Tables<"addons">;
export type TripType = Enums<"trip_type">;

export type FleetType = VehicleType & {
  vehicles: Vehicle[];
  pricing: PricingRule[];
  fromPrice: number | null;
};

export async function getFleet(): Promise<FleetType[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const supabase = createPublicClient();
  const [types, vehicles, pricing] = await Promise.all([
    supabase.from("vehicle_types").select("*").eq("active", true).order("sort_order"),
    supabase.from("vehicles").select("*").neq("status", "inactive").order("name"),
    supabase.from("pricing_rules").select("*").eq("active", true),
  ]);
  if (types.error) throw types.error;
  if (vehicles.error) throw vehicles.error;
  if (pricing.error) throw pricing.error;

  return types.data.map((t) => {
    const rules = pricing.data.filter((p) => p.vehicle_type_id === t.id);
    const prices = rules.map((r) => r.base_price);
    return {
      ...t,
      vehicles: vehicles.data.filter((v) => v.type_id === t.id),
      pricing: rules,
      fromPrice: prices.length ? Math.min(...prices) : null,
    };
  });
}

export async function getDestinations(): Promise<Destination[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const { data, error } = await createPublicClient()
    .from("destinations")
    .select("*, destination_prices(vehicle_type_id, price)")
    .eq("active", true)
    .order("est_hours");
  if (error) throw error;
  return data.map(({ destination_prices, ...d }) => ({
    ...d,
    prices: Object.fromEntries(destination_prices.map((p) => [p.vehicle_type_id, p.price])),
  }));
}

export async function getAddons(): Promise<Addon[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const { data, error } = await createPublicClient()
    .from("addons")
    .select("*")
    .eq("active", true)
    .order("price");
  if (error) throw error;
  return data;
}

export type PublishedReview = Pick<Tables<"reviews">, "id" | "rating" | "comment" | "created_at">;

export async function getPublishedReviews(limit = 6): Promise<PublishedReview[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("reviews");

  const { data, error } = await createPublicClient()
    .from("reviews")
    .select("id, rating, comment, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/** Lowest base price per trip type across van types, for "from GHS …" labels. */
export function fromPricesByTrip(fleet: FleetType[]): Partial<Record<TripType, number>> {
  const out: Partial<Record<TripType, number>> = {};
  for (const t of fleet) {
    for (const r of t.pricing) {
      const cur = out[r.trip_type];
      if (cur === undefined || r.base_price < cur) out[r.trip_type] = r.base_price;
    }
  }
  return out;
}
