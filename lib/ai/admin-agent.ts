import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { tripTypeLabels } from "@/lib/content";
import { site } from "@/lib/site";

// Admin assistant: answers questions about the business from live data and drafts messages.
// READ-ONLY by design: every tool only reads, through the signed-in admin's own client (RLS applies),
// so it can never change bookings, prices or payments. Changes are made in the admin screens.

type Db = SupabaseClient<Database>;

export function adminInstructions(now = new Date()) {
  return `You are the operations assistant inside the ${site.name} admin area. Staff ask you about bookings, trips, drivers, vehicles, customers and money.

Rules
- Answer ONLY from tool results. Never guess numbers, names, dates or prices. If a tool returns nothing, say so.
- You can read data but cannot change anything. If asked to change something, say which admin screen to use (Bookings, Calendar, Vehicles, Places & extras, Customers, Drivers, Business details).
- Today is ${now.toISOString().slice(0, 10)} (Accra time = GMT). Money is in Ghana cedis (GHS).
- Be brief and scannable: short lines, bullet lists, totals in bold. Refer to bookings by their ref (e.g. ELS-ABC12).
- When asked to draft a WhatsApp/SMS/email to a customer, write it warmly in Ghanaian English, short, signed "Elsasu Rentals". Never include card or MoMo PINs.`;
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD");
const live = ["pending_payment", "confirmed", "assigned", "in_progress"] as const;
const statusEnum = z.enum(["pending_payment", "confirmed", "assigned", "in_progress", "completed", "cancelled", "refunded"]);

const startOf = (d: string) => `${d}T00:00:00Z`;
const endOf = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString();
const place = (p: unknown) => (p && typeof p === "object" && "address" in p ? String((p as { address: unknown }).address) : null);

export function adminTools(db: Db) {
  return {
    find_bookings: tool({
      description: "Find bookings by trip date range, status and/or a search (ref, customer name or phone). Returns up to `limit` bookings.",
      inputSchema: z.object({
        from: day.optional(),
        to: day.optional().describe("inclusive"),
        status: statusEnum.optional(),
        search: z.string().max(60).optional(),
        limit: z.number().int().min(1).max(30).default(15),
      }),
      execute: async ({ from, to, status, search, limit }) => {
        let q = db
          .from("bookings")
          .select("ref_code, start_at, status, trip_type, passengers, contact_name, contact_phone, total, amount_paid, pickup, dropoff, driver_id, vehicle_types(name)")
          .order("start_at")
          .limit(limit);
        if (from) q = q.gte("start_at", startOf(from));
        if (to) q = q.lt("start_at", endOf(to));
        if (status) q = q.eq("status", status);
        if (search) {
          const s = search.replace(/[%,()]/g, " ").trim();
          q = q.or(`ref_code.ilike.%${s}%,contact_name.ilike.%${s}%,contact_phone.ilike.%${s.replace(/\D/g, "").replace(/^0/, "") || s}%`);
        }
        const { data, error } = await q;
        if (error) return { error: "Couldn't read bookings." };
        return data.map((b) => ({
          ref: b.ref_code,
          start: b.start_at,
          status: b.status,
          trip: tripTypeLabels[b.trip_type],
          vehicle: (b.vehicle_types as { name: string } | null)?.name ?? null,
          passengers: b.passengers,
          customer: b.contact_name,
          phone: b.contact_phone,
          from: place(b.pickup),
          to: place(b.dropoff),
          total: b.total,
          paid: b.amount_paid,
          balance: Math.max(0, b.total - b.amount_paid),
          driverAssigned: Boolean(b.driver_id),
        }));
      },
    }),

    day_schedule: tool({
      description: "All active trips on one day, in time order, with vehicle, plate and driver. Flags trips that still need a driver.",
      inputSchema: z.object({ date: day }),
      execute: async ({ date }) => {
        const { data, error } = await db
          .from("bookings")
          .select("ref_code, start_at, end_at, status, trip_type, passengers, contact_name, pickup, dropoff, vehicle_types(name), vehicles(plate), drivers(profiles(full_name))")
          .gte("start_at", startOf(date))
          .lt("start_at", endOf(date))
          .in("status", [...live])
          .order("start_at");
        if (error) return { error: "Couldn't read the schedule." };
        return data.map((b) => ({
          ref: b.ref_code,
          time: b.start_at.slice(11, 16),
          until: b.end_at.slice(11, 16),
          status: b.status,
          trip: tripTypeLabels[b.trip_type],
          vehicle: (b.vehicle_types as { name: string } | null)?.name ?? null,
          plate: (b.vehicles as { plate: string } | null)?.plate ?? null,
          driver: (b.drivers as { profiles: { full_name: string | null } | null } | null)?.profiles?.full_name ?? null,
          needsDriver: !b.drivers,
          customer: b.contact_name,
          passengers: b.passengers,
          from: place(b.pickup),
          to: place(b.dropoff),
        }));
      },
    }),

    money_summary: tool({
      description: "Money between two dates (by payment date): collected, refunded, net, number of payments, plus balances still owed on upcoming active bookings.",
      inputSchema: z.object({ from: day, to: day.describe("inclusive") }),
      execute: async ({ from, to }) => {
        const [{ data: pays, error }, { data: owed }] = await Promise.all([
          db.from("payments").select("kind, amount, status, created_at").gte("created_at", startOf(from)).lt("created_at", endOf(to)),
          db.from("bookings").select("total, amount_paid").in("status", ["confirmed", "assigned", "in_progress"]),
        ]);
        if (error) return { error: "Couldn't read payments." };
        const all = pays ?? [];
        const received = all.filter((p) => p.kind !== "refund" && p.status === "success");
        // Refund rows: "refunded"/"success" = money returned; "pending" = Paystack still processing.
        const refundsDone = all.filter((p) => p.kind === "refund" && (p.status === "refunded" || p.status === "success"));
        const refundsPending = all.filter((p) => p.kind === "refund" && p.status === "pending");
        const sum = (rows: { amount: number }[]) => rows.reduce((s, p) => s + Math.abs(p.amount), 0);
        const collected = sum(received);
        const refunded = sum(refundsDone);
        return {
          from,
          to,
          collected,
          refunded,
          refundsStillProcessing: sum(refundsPending),
          net: collected - refunded - sum(refundsPending),
          payments: received.length,
          failedOrAbandoned: all.filter((p) => p.kind !== "refund" && (p.status === "failed" || p.status === "abandoned")).length,
          balancesOwedOnActiveBookings: (owed ?? []).reduce((s, b) => s + Math.max(0, b.total - b.amount_paid), 0),
        };
      },
    }),

    fleet_status: tool({
      description: "Vehicle types (with whether they're on the website), each vehicle's status, and drivers (active, licence expiry).",
      inputSchema: z.object({}),
      execute: async () => {
        const [{ data: types }, { data: vehicles }, { data: drivers }] = await Promise.all([
          db.from("vehicle_types").select("id, name, seats, category, active").order("sort_order"),
          db.from("vehicles").select("name, plate, status, type_id, current_mileage"),
          db.from("drivers").select("is_active, licence_expiry, rating, profiles(full_name)"),
        ]);
        return {
          types: (types ?? []).map((t) => ({
            name: t.name,
            seats: t.seats,
            category: t.category,
            onWebsite: t.active,
            vehicles: (vehicles ?? []).filter((v) => v.type_id === t.id).map((v) => ({ name: v.name, plate: v.plate, status: v.status, km: v.current_mileage })),
          })),
          drivers: (drivers ?? []).map((d) => ({
            name: (d.profiles as { full_name: string | null } | null)?.full_name ?? "Driver",
            active: d.is_active,
            licenceExpires: d.licence_expiry,
            rating: d.rating,
          })),
        };
      },
    }),

    customer_lookup: tool({
      description: "Find customers by name, phone or email, with how many bookings they have.",
      inputSchema: z.object({ search: z.string().min(2).max(60) }),
      execute: async ({ search }) => {
        const s = search.replace(/[%,()]/g, " ").trim();
        const digits = s.replace(/\D/g, "").replace(/^0/, "");
        const { data, error } = await db
          .from("profiles")
          .select("full_name, phone, email, role, created_at, bookings(count)")
          .or([`full_name.ilike.%${s}%`, `email.ilike.%${s}%`, digits.length >= 3 ? `phone.ilike.%${digits}%` : null].filter(Boolean).join(","))
          .limit(10);
        if (error) return { error: "Couldn't search customers." };
        return data.map((p) => ({
          name: p.full_name,
          phone: p.phone,
          email: p.email,
          role: p.role,
          joined: p.created_at.slice(0, 10),
          bookings: (p.bookings as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
        }));
      },
    }),
  };
}
