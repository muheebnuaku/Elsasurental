import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paystackConfigured, verifyTransaction } from "@/lib/payments/paystack";
import type { Json } from "@/types/supabase";
import { afterPaymentRecorded } from "@/lib/booking/events";
import { reportError } from "@/lib/observability";

export type BookingGroup = NonNullable<Awaited<ReturnType<typeof loadBookingGroup>>>;

/** A booking and its group, as the signed-in user may see it (RLS). Null if not theirs. */
export async function loadBookingGroup(ref: string) {
  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("bookings")
    .select("id, ref_code, group_id, trip_type, status, start_at, end_at, pickup, dropoff, stops, passengers, contact_name, contact_phone, contact_email, created_at, quote_snapshot")
    .eq("ref_code", ref)
    .maybeSingle();
  if (!lead) return null;

  const { data: rows } = lead.group_id
    ? await supabase.from("bookings").select("id, ref_code, status, passengers, total, amount_paid, deposit_amount, subtotal, discount, vehicle_type_id, created_at").eq("group_id", lead.group_id).order("created_at")
    : await supabase.from("bookings").select("id, ref_code, status, passengers, total, amount_paid, deposit_amount, subtotal, discount, vehicle_type_id, created_at").eq("id", lead.id);
  const bookings = rows ?? [];
  const leadId = bookings[0]?.id ?? lead.id;

  const { data: payments } = await supabase
    .from("payments")
    .select("reference, kind, amount, status, method, paid_at, created_at, raw")
    .eq("booking_id", leadId)
    .order("created_at", { ascending: false });

  const live = bookings.filter((b) => !["cancelled", "refunded"].includes(b.status));
  const sum = (k: "total" | "amount_paid" | "subtotal" | "discount") => Math.round(live.reduce((s, b) => s + Number(b[k]), 0) * 100) / 100;
  const total = sum("total");
  const paid = sum("amount_paid");
  return {
    lead,
    leadId,
    bookings,
    payments: payments ?? [],
    total,
    paid,
    subtotal: sum("subtotal"),
    discount: sum("discount"),
    balance: Math.max(0, Math.round((total - paid) * 100) / 100),
    cancelled: live.length === 0,
  };
}

/** If Paystack says a pending payment succeeded, record it now (webhook may be delayed). Idempotent. */
export async function reconcilePayment(reference: string) {
  if (!paystackConfigured()) return;
  const db = createAdminClient();
  const { data: payment } = await db.from("payments").select("status").eq("reference", reference).maybeSingle();
  if (!payment || payment.status !== "pending") return;
  try {
    const tx = await verifyTransaction(reference);
    if (tx.success) {
      const { data: rec } = await db.rpc("record_payment_success", {
        p_reference: reference,
        p_amount: tx.amountGhs,
        p_method: tx.method as never,
        p_paid_at: tx.paidAt ?? new Date().toISOString(),
        p_raw: tx.raw as unknown as Json,
      });
      if (rec?.[0]?.applied) afterPaymentRecorded(reference);
    } else if (["failed", "abandoned", "reversed"].includes(tx.status)) {
      await db.from("payments").update({ status: tx.status as "failed" | "abandoned" | "reversed", raw: tx.raw as unknown as Json }).eq("reference", reference).eq("status", "pending");
    }
  } catch (e) {
    reportError("payment.reconcile", e, { reference });
  }
}

export const place = (p: unknown) =>
  p && typeof p === "object" && "address" in p && typeof (p as { address: unknown }).address === "string" ? (p as { address: string }).address : null;
