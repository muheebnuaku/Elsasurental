"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeGhanaPhone } from "@/lib/phone";
import type { AdminResult } from "@/lib/actions/admin-bookings";

// Vans, drivers and prices. Every change refreshes the public catalogue cache immediately.

const done = (message: string): AdminResult => {
  updateTag("catalog");
  revalidatePath("/admin", "layout");
  return { ok: true, message };
};
const fail = (message: string): AdminResult => ({ ok: false, message });
const list = (v: FormDataEntryValue | null) =>
  String(v ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
const urls = (v: FormDataEntryValue | null) => {
  try {
    const arr = JSON.parse(String(v ?? "[]"));
    return Array.isArray(arr) ? arr.filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u)).slice(0, 20) : [];
  } catch {
    return [];
  }
};

// ── Vehicle types (what the website sells: "8-Seater Minivan", "7-Seater SUV"…) ──
const typeSchema = z.object({
  id: z.guid().or(z.literal("")),
  name: z.string().trim().min(2, "Give the vehicle type a name.").max(60),
  category: z.enum(["van", "suv"]),
  seats: z.coerce.number().int().min(1, "Seats must be at least 1.").max(60),
  luggage_capacity: z.coerce.number().int().min(0).max(60),
  description: z.string().trim().max(400),
  sort_order: z.coerce.number().int().min(0).max(999),
  active: z.union([z.literal("on"), z.literal("")]).optional(),
  copy_from: z.guid().or(z.literal("")).optional(),
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

export async function saveVehicleType(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const parsed = typeSchema.safeParse({ ...Object.fromEntries(formData), active: formData.get("active") ?? "" });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the vehicle type.");
  const { id, active, copy_from, description, ...t } = parsed.data;
  const row = { ...t, description: description || null, active: active === "on" };

  if (id) {
    const { error } = await supabase.from("vehicle_types").update(row).eq("id", id);
    return error ? fail("Couldn't save the vehicle type.") : done("Vehicle type saved. The website shows it now.");
  }

  const { data: created, error } = await supabase
    .from("vehicle_types")
    .insert({ ...row, slug: slugify(t.name) || `type-${Date.now()}` })
    .select("id")
    .single();
  if (error || !created) return fail(error?.code === "23505" ? "A vehicle type with that name already exists." : "Couldn't add the vehicle type.");

  // Start its prices from a similar type so it can be quoted straight away; adjust them on its page.
  if (copy_from) {
    const [{ data: rules }, { data: dests }] = await Promise.all([
      supabase.from("pricing_rules").select("trip_type, base_price, included_km, included_hours, extra_km_rate, extra_hour_rate, night_surcharge_pct").eq("vehicle_type_id", copy_from).eq("active", true),
      supabase.from("destination_prices").select("destination_id, price").eq("vehicle_type_id", copy_from),
    ]);
    if (rules?.length) await supabase.from("pricing_rules").insert(rules.map((r) => ({ ...r, vehicle_type_id: created.id })));
    if (dests?.length) await supabase.from("destination_prices").insert(dests.map((d) => ({ ...d, vehicle_type_id: created.id })));
  }
  return { ...done("Vehicle type added. Check its prices, then add its vehicles."), id: created.id };
}

// ── Vehicles (individual vans/SUVs with plates) ───────────────────────
const vehicleSchema = z.object({
  id: z.guid().or(z.literal("")),
  type_id: z.guid("Choose a vehicle type."),
  name: z.string().trim().min(2, "Give the vehicle a name.").max(60),
  plate: z.string().trim().toUpperCase().min(4, "Enter the number plate.").max(20),
  status: z.enum(["available", "on_trip", "maintenance", "inactive"]),
  current_mileage: z.coerce.number().int().min(0).max(2_000_000),
  year: z.union([z.literal(""), z.coerce.number().int().min(1990).max(2100)]),
  colour: z.string().trim().max(30),
});

export async function saveVehicle(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the vehicle details.");
  const { id, year, ...v } = parsed.data;
  const row = {
    ...v,
    year: year === "" ? null : year,
    colour: v.colour || null,
    features: list(formData.get("features")),
    photos: urls(formData.get("photos")),
    videos: urls(formData.get("videos")),
  };
  const { error } = id ? await supabase.from("vehicles").update(row).eq("id", id) : await supabase.from("vehicles").insert(row);
  if (error) return fail(error.code === "23505" ? "Another vehicle already has that number plate." : "Couldn't save the vehicle.");
  return done(id ? "Vehicle updated." : "Vehicle added.");
}

// ── Drivers ───────────────────────────────────────────────────────────
const driverSchema = z.object({
  id: z.guid().or(z.literal("")),
  full_name: z.string().trim().min(2, "Enter the driver's name.").max(80),
  phone: z.string(),
  licence_no: z.string().trim().min(3, "Enter the licence number.").max(40),
  licence_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the licence expiry date."),
  is_active: z.union([z.literal("on"), z.literal("")]).optional(),
});

export async function saveDriver(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  await requireAdmin();
  const parsed = driverSchema.safeParse({ ...Object.fromEntries(formData), is_active: formData.get("is_active") ?? "" });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the driver details.");
  const d = parsed.data;
  const db = createAdminClient();
  const active = d.is_active === "on";

  if (d.id) {
    const { data: drv } = await db.from("drivers").update({ licence_no: d.licence_no, licence_expiry: d.licence_expiry, is_active: active }).eq("id", d.id).select("profile_id").single();
    if (drv) await db.from("profiles").update({ full_name: d.full_name }).eq("id", drv.profile_id);
    return done("Driver updated.");
  }

  const phone = normalizeGhanaPhone(d.phone);
  if (!phone) return fail("Enter the driver's Ghana mobile number.");

  // Reuse an existing account with this number, or create one; the driver signs in with SMS codes.
  let profileId: string | undefined;
  const { data: existing } = await db.from("profiles").select("id, role").eq("phone", phone).maybeSingle();
  if (existing) {
    if (existing.role === "admin") return fail("That number belongs to an admin account.");
    profileId = existing.id;
  } else {
    const { data: created, error } = await db.auth.admin.createUser({ phone, phone_confirm: true, user_metadata: { full_name: d.full_name } });
    if (error || !created.user) return fail("Couldn't create the driver's login.");
    profileId = created.user.id;
  }
  await db.from("profiles").update({ role: "driver", full_name: d.full_name }).eq("id", profileId);
  const { error } = await db.from("drivers").insert({ profile_id: profileId, licence_no: d.licence_no, licence_expiry: d.licence_expiry, is_active: active });
  if (error) return fail(error.code === "23505" ? "This person is already a driver." : "Couldn't add the driver.");
  return done("Driver added. They sign in at /login: first time, tap \"Forgot password?\" to set a password.");
}

// ── Pricing rules ─────────────────────────────────────────────────────
const money = z.coerce.number().min(0).max(1_000_000);
const ruleSchema = z.object({
  id: z.guid(),
  base_price: money,
  included_km: z.coerce.number().int().min(0).max(10_000),
  included_hours: z.coerce.number().min(0).max(240),
  extra_km_rate: money,
  extra_hour_rate: money,
  night_surcharge_pct: z.coerce.number().min(0).max(100),
});

export async function savePricingRule(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const parsed = ruleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Check the numbers.");
  const { id, ...r } = parsed.data;
  const { error } = await supabase.from("pricing_rules").update(r).eq("id", id);
  return error ? fail("Couldn't save the price.") : done("Price saved. The website shows it now.");
}

// ── Destinations ──────────────────────────────────────────────────────
const destSchema = z.object({
  id: z.guid().or(z.literal("")),
  name: z.string().trim().min(2).max(60),
  region: z.string().trim().min(2).max(40),
  est_hours: z.coerce.number().min(0.25).max(24),
  distance_km: z.union([z.literal(""), z.coerce.number().int().min(0).max(2000)]),
  image_url: z.union([z.literal(""), z.string().url().max(500)]),
  active: z.union([z.literal("on"), z.literal("")]).optional(),
});

export async function saveDestination(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const parsed = destSchema.safeParse({ ...Object.fromEntries(formData), active: formData.get("active") ?? "" });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the destination.");

  // "price:<vehicle_type_id>" fields; an empty box means that vehicle doesn't go there.
  const prices: { vehicle_type_id: string; price: number }[] = [];
  const cleared: string[] = [];
  for (const [key, value] of formData) {
    if (!key.startsWith("price:")) continue;
    const typeId = z.guid().safeParse(key.slice(6));
    if (!typeId.success) return fail("Check the prices.");
    if (String(value).trim() === "") {
      cleared.push(typeId.data);
      continue;
    }
    const price = money.safeParse(value);
    if (!price.success) return fail("Check the prices.");
    prices.push({ vehicle_type_id: typeId.data, price: price.data });
  }
  if (!prices.length) return fail("Add a price for at least one vehicle.");

  const { id, active, distance_km, image_url, ...d } = parsed.data;
  const row = { ...d, distance_km: distance_km === "" ? null : distance_km, image_url: image_url || null, active: active === "on" };
  const slug = slugify(d.name);
  const saved = id
    ? await supabase.from("destinations").update(row).eq("id", id).select("id").single()
    : await supabase.from("destinations").insert({ ...row, slug }).select("id").single();
  if (saved.error) return fail(saved.error.code === "23505" ? "That destination already exists." : "Couldn't save the destination.");

  const destinationId = saved.data.id;
  const { error } = await supabase
    .from("destination_prices")
    .upsert(prices.map((p) => ({ ...p, destination_id: destinationId })));
  if (!error && cleared.length) {
    await supabase.from("destination_prices").delete().eq("destination_id", destinationId).in("vehicle_type_id", cleared);
  }
  return error ? fail("Saved the destination, but not its prices. Try again.") : done("Destination saved.");
}

// ── Add-ons ───────────────────────────────────────────────────────────
const addonSchema = z.object({
  id: z.guid().or(z.literal("")),
  name: z.string().trim().min(2, "Give the extra a name.").max(60),
  description: z.string().trim().max(200).optional(),
  unit: z.enum(["per_trip", "per_item", "per_day", "per_hour"]).optional(),
  price: money,
  active: z.union([z.literal("on"), z.literal("")]).optional(),
});

export async function saveAddon(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const parsed = addonSchema.safeParse({ ...Object.fromEntries(formData), active: formData.get("active") ?? "" });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the extra.");
  const { id, active, description, unit, ...a } = parsed.data;
  if (id) {
    const { error } = await supabase.from("addons").update({ ...a, ...(description !== undefined ? { description: description || null } : {}), active: active === "on" }).eq("id", id);
    return error ? fail("Couldn't save the extra.") : done("Extra saved.");
  }
  const { error } = await supabase.from("addons").insert({ ...a, description: description || null, unit: unit ?? "per_trip", active: true, slug: slugify(a.name) });
  return error ? fail(error.code === "23505" ? "An extra with that name already exists." : "Couldn't add the extra.") : done("Extra added.");
}

// ── Promo codes ───────────────────────────────────────────────────────
const promoSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, "Use 3–20 letters/numbers."),
  type: z.enum(["percent", "fixed"]),
  value: z.coerce.number().positive(),
  max_uses: z.union([z.literal(""), z.coerce.number().int().positive()]),
  valid_to: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
});

export async function createPromo(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const parsed = promoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the promo code.");
  const p = parsed.data;
  if (p.type === "percent" && p.value > 100) return fail("A percentage can't be over 100.");
  const { error } = await supabase.from("promo_codes").insert({
    code: p.code, type: p.type, value: p.value, max_uses: p.max_uses === "" ? null : p.max_uses,
    valid_to: p.valid_to ? `${p.valid_to}T23:59:59Z` : null,
  });
  return error ? fail(error.code === "23505" ? "That code already exists." : "Couldn't create the code.") : done(`Promo ${p.code} created.`);
}

export async function togglePromo(id: string, active: boolean): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("promo_codes").update({ active }).eq("id", id);
  return error ? fail("Couldn't update the code.") : done(active ? "Code switched on." : "Code switched off.");
}

// ── One vehicle type's fixed destination prices ("dest:<destination_id>" fields; empty = not offered) ──
export async function saveTypeDestinationPrices(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const typeId = z.guid().safeParse(formData.get("vehicle_type_id"));
  if (!typeId.success) return fail("Something's not right. Refresh and try again.");

  const upserts: { destination_id: string; vehicle_type_id: string; price: number }[] = [];
  const cleared: string[] = [];
  for (const [key, value] of formData) {
    if (!key.startsWith("dest:")) continue;
    const destId = z.guid().safeParse(key.slice(5));
    if (!destId.success) return fail("Check the prices.");
    if (String(value).trim() === "") {
      cleared.push(destId.data);
      continue;
    }
    const price = money.safeParse(value);
    if (!price.success) return fail("Check the prices.");
    upserts.push({ destination_id: destId.data, vehicle_type_id: typeId.data, price: price.data });
  }

  if (upserts.length) {
    const { error } = await supabase.from("destination_prices").upsert(upserts);
    if (error) return fail("Couldn't save the prices.");
  }
  if (cleared.length) {
    await supabase.from("destination_prices").delete().eq("vehicle_type_id", typeId.data).in("destination_id", cleared);
  }
  return done("Destination prices saved.");
}
