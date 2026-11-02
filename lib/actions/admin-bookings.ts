"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelBooking } from "@/lib/booking/cancel";
import { createBookingFromQuote, groupMoney, startPayment } from "@/lib/booking/service";
import { afterPaymentRecorded } from "@/lib/booking/events";
import { notifySafe, type NotifyEvent } from "@/lib/notifications";
import { normalizeGhanaPhone } from "@/lib/phone";

export type AdminResult = { ok: boolean; message: string; ref?: string; url?: string; id?: string };

const fail = (message: string): AdminResult => ({ ok: false, message });
const refresh = (ref?: string) => {
  revalidatePath("/admin", "layout");
  if (ref) revalidatePath(`/admin/bookings/${ref}`);
};

async function bookingByRef(ref: string) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("bookings").select("id, ref_code, group_id, status, driver_id, vehicle_id").eq("ref_code", ref).maybeSingle();
  return { supabase, booking: data };
}

/** Lead (first) booking of a group — payments and messages attach to it. */
async function leadOf(b: { id: string; group_id: string | null }) {
  if (!b.group_id) return b.id;
  const { data } = await createAdminClient().from("bookings").select("id").eq("group_id", b.group_id).order("created_at").limit(1).single();
  return data?.id ?? b.id;
}

// ── Assign van + driver ───────────────────────────────────────────────
const assignSchema = z.object({ ref: z.string(), vehicleId: z.guid().or(z.literal("")), driverId: z.guid().or(z.literal("")) });

export async function assignBooking(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const parsed = assignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Pick a van and driver.");
  const { ref, vehicleId, driverId } = parsed.data;
  const { supabase, booking } = await bookingByRef(ref);
  if (!booking) return fail("Booking not found.");
  if (!["pending_payment", "confirmed", "assigned"].includes(booking.status)) return fail("This booking can't be changed now.");

  const status = driverId && booking.status === "confirmed" ? "assigned" : !driverId && booking.status === "assigned" ? "confirmed" : booking.status;
  const { error } = await supabase
    .from("bookings")
    .update({ vehicle_id: vehicleId || null, driver_id: driverId || null, status })
    .eq("id", booking.id);
  if (error) {
    if (error.code === "23P01") return fail("That van or driver is already booked at this time.");
    return fail("Couldn't save. Please try again.");
  }
  if (driverId && driverId !== booking.driver_id) {
    after(() => notifySafe("driver_assigned", booking.id, { suffix: driverId }));
  }
  refresh(ref);
  return { ok: true, message: driverId ? "Assigned. The customer has been notified." : "Saved." };
}

/** Calendar drag & drop: move a booking to another van (the database refuses clashes). */
export async function moveBookingToVan(bookingId: string, vehicleId: string): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const [{ data: booking }, { data: van }] = await Promise.all([
    supabase.from("bookings").select("vehicle_type_id").eq("id", bookingId).single(),
    supabase.from("vehicles").select("type_id, status").eq("id", vehicleId).single(),
  ]);
  if (!booking || !van) return fail("Booking or van not found.");
  if (booking.vehicle_type_id !== van.type_id) return fail("Move it to a van of the same size (the price depends on it).");
  if (van.status === "maintenance" || van.status === "inactive") return fail("That van is not in service.");
  const { error } = await supabase.from("bookings").update({ vehicle_id: vehicleId }).eq("id", bookingId).in("status", ["pending_payment", "confirmed", "assigned"]);
  if (error) return fail(error.code === "23P01" ? "That van is already booked then." : "Couldn't move the booking.");
  refresh();
  return { ok: true, message: "Moved." };
}

// ── Trip status ───────────────────────────────────────────────────────
const next: Record<string, { to: "in_progress" | "completed"; event: NotifyEvent }[]> = {
  confirmed: [{ to: "in_progress", event: "trip_started" }],
  assigned: [{ to: "in_progress", event: "trip_started" }],
  in_progress: [{ to: "completed", event: "trip_completed" }],
};

export async function advanceStatus(ref: string, to: "in_progress" | "completed"): Promise<AdminResult> {
  const { supabase, booking } = await bookingByRef(ref);
  if (!booking) return fail("Booking not found.");
  const step = next[booking.status]?.find((s) => s.to === to);
  if (!step) return fail("That status change isn't allowed.");
  const { error } = await supabase.from("bookings").update({ status: to }).eq("id", booking.id);
  if (error) return fail("Couldn't update the status.");
  after(async () => {
    await notifySafe(step.event, booking.id);
    if (to === "completed") await notifySafe("review_request", booking.id);
  });
  refresh(ref);
  return { ok: true, message: to === "completed" ? "Trip completed." : "Trip started." };
}

// ── Manual (cash / bank / MoMo-to-phone) payment ──────────────────────
const paySchema = z.object({
  ref: z.string(),
  amount: z.coerce.number().positive("Enter the amount received.").max(1_000_000),
  method: z.enum(["cash", "bank_transfer", "momo"]),
});

export async function recordManualPayment(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const parsed = paySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the amount.");
  const { ref, amount, method } = parsed.data;
  const { booking } = await bookingByRef(ref);
  if (!booking) return fail("Booking not found.");
  const leadId = await leadOf(booking);
  const money = await groupMoney(leadId);
  if (!money || money.cancelled) return fail("This booking is no longer active.");
  const due = Math.round((money.total - money.paid) * 100) / 100;
  if (amount > due + 0.001) return fail(`Only ${due} is outstanding.`);

  const db = createAdminClient();
  const reference = `MAN-${ref}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const kind = money.paid > 0 ? "balance" : amount >= due ? "full" : "deposit";
  const { error: insErr } = await db.from("payments").insert({ booking_id: leadId, reference, kind, amount, status: "pending", provider: "manual", method });
  if (insErr) return fail("Couldn't record the payment.");
  const { data, error } = await db.rpc("record_payment_success", {
    p_reference: reference, p_amount: amount, p_method: method, p_paid_at: new Date().toISOString(), p_raw: { recorded_by: "admin" },
  });
  if (error) return fail("Couldn't record the payment.");
  if (data?.[0]?.applied) afterPaymentRecorded(reference);
  refresh(ref);
  return { ok: true, message: "Payment recorded. The customer has been notified." };
}

// ── Cancel ────────────────────────────────────────────────────────────
export async function adminCancel(ref: string, mode: "policy" | "full" | "none", reason: string): Promise<AdminResult> {
  const { booking } = await bookingByRef(ref);
  if (!booking) return fail("Booking not found.");
  const r = await cancelBooking(await leadOf(booking), reason.trim() || "Cancelled by Elsasu", mode);
  if (!r.ok) return fail(r.error);
  refresh(ref);
  return { ok: true, message: r.refund > 0 ? `Cancelled. Refund of ${r.refund} sent via Paystack.` : "Cancelled." };
}

// ── Notes ─────────────────────────────────────────────────────────────
export async function saveAdminNotes(ref: string, notes: string): Promise<AdminResult> {
  const { supabase, booking } = await bookingByRef(ref);
  if (!booking) return fail("Booking not found.");
  const { error } = await supabase.from("bookings").update({ admin_notes: notes.slice(0, 2000) || null }).eq("id", booking.id);
  if (error) return fail("Couldn't save notes.");
  refresh(ref);
  return { ok: true, message: "Notes saved." };
}

// ── Phone / WhatsApp booking entered by staff ─────────────────────────
const phoneBookingSchema = z.object({
  quoteToken: z.string().min(20),
  name: z.string().trim().min(2, "Enter the customer's name.").max(80),
  phone: z.string(),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email()]).optional(),
  notes: z.string().trim().max(1000).optional(),
  payMode: z.enum(["link", "cash", "unpaid"]),
  cashAmount: z.coerce.number().min(0).optional(),
});

export async function createPhoneBooking(input: z.input<typeof phoneBookingSchema>): Promise<AdminResult> {
  await requireAdmin();
  const parsed = phoneBookingSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details.");
  const d = parsed.data;
  const phone = normalizeGhanaPhone(d.phone);
  if (!phone) return fail("Enter a valid Ghana mobile number.");

  // Link to their account if they already have one; otherwise it attaches when they sign up.
  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("id").eq("phone", phone).maybeSingle();

  const booking = await createBookingFromQuote({
    customerId: profile?.id ?? null,
    phone,
    name: d.name,
    email: d.email,
    notes: d.notes,
    quoteToken: d.quoteToken,
    source: "admin",
    holdMinutes: d.payMode === "unpaid" ? 7 * 24 * 60 : 24 * 60, // phone bookings: longer to pay
  });
  if (!booking.ok) return fail(booking.error);
  const { ref, leadId } = booking.data;

  if (d.payMode === "cash" && d.cashAmount && d.cashAmount > 0) {
    const fd = new FormData();
    fd.set("ref", ref);
    fd.set("amount", String(d.cashAmount));
    fd.set("method", "cash");
    const r = await recordManualPayment(null, fd);
    refresh(ref);
    return { ok: r.ok, message: r.ok ? `Booked ${ref} and recorded the cash payment.` : `Booked ${ref}, but: ${r.message}`, ref };
  }
  if (d.payMode === "link") {
    const pay = await startPayment(leadId, "deposit");
    refresh(ref);
    return pay.ok
      ? { ok: true, message: `Booked ${ref}. Send the customer this payment link.`, ref, url: pay.data.url }
      : { ok: true, message: `Booked ${ref}. Payment link unavailable: ${pay.error}`, ref };
  }
  refresh(ref);
  return { ok: true, message: `Booked ${ref} (unpaid, van held for 7 days).`, ref };
}

// ── Payment link (to send by WhatsApp/SMS for phone bookings) ─────────
export async function createPaymentLink(ref: string): Promise<AdminResult> {
  const { booking } = await bookingByRef(ref);
  if (!booking) return fail("Booking not found.");
  const pay = await startPayment(await leadOf(booking), "deposit");
  if (!pay.ok) return fail(pay.error);
  refresh(ref);
  return { ok: true, message: "Payment link ready.", url: pay.data.url };
}
