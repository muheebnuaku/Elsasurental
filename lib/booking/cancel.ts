import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { allocate } from "@/lib/booking/allocate";
import { refundFor } from "@/lib/booking/cancellation";
import { afterBookingCancelled } from "@/lib/booking/events";
import { createRefund, paystackConfigured } from "@/lib/payments/paystack";
import { reportError } from "@/lib/observability";

type Result = { ok: true; refund: number; pct: number } | { ok: false; status: number; error: string };

/**
 * Cancel a booking group under the cancellation policy and refund through Paystack.
 * Vans are freed immediately; the refund completes asynchronously (refund.processed webhook).
 * Call only after checking the caller may cancel this booking.
 */
export async function cancelBooking(leadId: string, reason: string, mode: "policy" | "full" | "none" = "policy"): Promise<Result> {
  const db = createAdminClient();
  const { data: lead } = await db.from("bookings").select("id, group_id, start_at, status").eq("id", leadId).single();
  if (!lead) return { ok: false, status: 404, error: "Booking not found." };
  if (!["pending_payment", "confirmed", "assigned"].includes(lead.status)) {
    return { ok: false, status: 409, error: lead.status === "in_progress" ? "This trip has already started." : "This booking can no longer be cancelled." };
  }

  const { data: payments } = await db
    .from("payments")
    .select("id, reference, amount, status, kind")
    .eq("booking_id", leadId)
    .eq("status", "success")
    .neq("kind", "refund");
  const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const policy = refundFor(lead.start_at, paid);
  // Admins may refund in full (e.g. Elsasu cancelled) or not at all; customers always get the policy.
  const { amount: refund, pct } = mode === "full" ? { amount: paid, pct: 100 } : mode === "none" ? { amount: 0, pct: 0 } : policy;
  if (refund > 0 && !paystackConfigured()) {
    return { ok: false, status: 503, error: "Refunds aren't switched on yet. Please contact us to cancel." };
  }

  const { error } = await db.rpc("cancel_booking_group", { p_lead: leadId, p_reason: reason });
  if (error) return { ok: false, status: 500, error: "Couldn't cancel. Please try again." };

  if (refund > 0 && payments?.length) {
    const parts = allocate(refund, payments.map((p) => Number(p.amount)));
    for (const [i, p] of payments.entries()) {
      const part = parts[i] ?? 0;
      if (part <= 0) continue;
      try {
        const r = await createRefund(p.reference, part);
        await db.from("payments").insert({
          booking_id: leadId, kind: "refund", amount: part, status: "pending", provider: "paystack", refund_of: p.id,
          reference: `RF-${r.refundId ?? randomBytes(4).toString("hex")}`, raw: { refund_id: r.refundId, paystack_status: r.status },
        });
      } catch (e) {
        // Booking stays cancelled; the failed refund is visible to admins for manual follow-up.
        await db.from("payments").insert({
          booking_id: leadId, kind: "refund", amount: part, status: "failed", provider: "paystack", refund_of: p.id,
          reference: `RF-FAILED-${randomBytes(4).toString("hex")}`, raw: { error: e instanceof Error ? e.message.slice(0, 200) : "refund failed" },
        });
        reportError("cancel.refund", e, { reference: p.reference, amount: part });
      }
    }
  }

  afterBookingCancelled(leadId, refund);
  return { ok: true, refund, pct };
}

/** Called from the Paystack webhook when a refund completes. */
export async function markRefundProcessed(refundId: string) {
  const db = createAdminClient();
  const { data: row } = await db.from("payments").update({ status: "refunded" }).eq("reference", `RF-${refundId}`).eq("status", "pending").select("booking_id").maybeSingle();
  if (!row) return;
  // Once no refunds are pending, the whole group is "refunded".
  const { count } = await db.from("payments").select("id", { count: "exact", head: true }).eq("booking_id", row.booking_id).eq("kind", "refund").eq("status", "pending");
  if ((count ?? 0) > 0) return;
  const { data: lead } = await db.from("bookings").select("id, group_id").eq("id", row.booking_id).single();
  if (!lead) return;
  const q = db.from("bookings").update({ status: "refunded" }).eq("status", "cancelled");
  await (lead.group_id ? q.eq("group_id", lead.group_id) : q.eq("id", lead.id));
}
