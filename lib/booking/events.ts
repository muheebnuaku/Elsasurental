import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifySafe } from "@/lib/notifications";
import { notifyDriversOfCancellation } from "@/lib/notifications/driver";
import { trackServer } from "@/lib/analytics/server";
import { reportError } from "@/lib/observability";

/**
 * After a payment is recorded for the first time: first payment → "booking confirmed",
 * later payments → "payment received". Runs after the response is sent (never slows payments down).
 */
export function afterPaymentRecorded(reference: string) {
  after(async () => {
    const { data: p } = await createAdminClient()
      .from("payments")
      .select("booking_id, kind, amount, method, bookings(ref_code, customer_id, trip_type, source)")
      .eq("reference", reference)
      .maybeSingle();
    if (!p) return;
    if (p.kind === "balance") await notifySafe("payment_received", p.booking_id, { amount: Number(p.amount), suffix: reference });
    else await notifySafe("booking_confirmed", p.booking_id);

    const b = p.bookings as { ref_code: string; customer_id: string | null; trip_type: string; source: string } | null;
    await trackServer("payment_succeeded", b?.customer_id ?? `booking:${b?.ref_code ?? reference}`, {
      ref: b?.ref_code ?? null, kind: p.kind, amount: Number(p.amount), method: p.method, trip_type: b?.trip_type ?? null, source: b?.source ?? null,
    }).catch((e) => reportError("analytics.payment", e, { reference }));
  });
}

export function afterBookingCancelled(bookingId: string, refund: number) {
  after(async () => {
    await notifySafe("booking_cancelled", bookingId, { amount: refund });
    await notifyDriversOfCancellation(bookingId);
    const { data: b } = await createAdminClient().from("bookings").select("ref_code, customer_id, trip_type").eq("id", bookingId).maybeSingle();
    if (b) {
      await trackServer("booking_cancelled", b.customer_id ?? `booking:${b.ref_code}`, { ref: b.ref_code, refund, trip_type: b.trip_type })
        .catch((e) => reportError("analytics.cancel", e, { ref: b.ref_code }));
    }
  });
}
