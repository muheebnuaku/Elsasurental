import { createAdminClient } from "@/lib/supabase/admin";
import { methodFromChannel, sanitize, verifyWebhookSignature } from "@/lib/payments/paystack";
import type { Json } from "@/types/supabase";
import { afterPaymentRecorded } from "@/lib/booking/events";
import { markRefundProcessed } from "@/lib/booking/cancel";
import { reportError } from "@/lib/observability";

// Paystack → us. Signature-checked (HMAC-SHA512) and idempotent: replays and duplicates are harmless.
// Dashboard: Settings → API Keys & Webhooks → Webhook URL = https://<domain>/api/webhooks/paystack

type Event = {
  event: string;
  data: { reference: string; amount: number; currency: string; channel: string; paid_at: string | null; status: string } & Record<string, unknown>;
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(raw) as Event;
  const db = createAdminClient();

  if (event.event === "charge.success" && event.data.status === "success") {
    const { data: rec, error } = await db.rpc("record_payment_success", {
      p_reference: event.data.reference,
      p_amount: event.data.amount / 100,
      p_method: methodFromChannel(event.data.channel) as never,
      p_paid_at: event.data.paid_at ?? new Date().toISOString(),
      p_raw: sanitize(event.data as never) as unknown as Json,
    });
    if (error && !error.message.includes("PAYMENT_NOT_FOUND")) {
      // Let Paystack retry real failures (it retries non-2xx responses).
      reportError("paystack.webhook", new Error(error.message), { reference: event.data.reference });
      return new Response("Retry later", { status: 500 });
    }
    if (rec?.[0]?.applied) afterPaymentRecorded(event.data.reference);
  } else if (event.event === "refund.processed") {
    // TODO(confirm): Paystack's refund payload — we match on the refund id returned when the refund was created.
    const refundId = String((event.data as Record<string, unknown>).id ?? (event.data as Record<string, unknown>).refund_reference ?? "");
    if (refundId) await markRefundProcessed(refundId);
  } else if (event.event === "charge.failed") {
    await db.from("payments").update({ status: "failed" }).eq("reference", event.data.reference).eq("status", "pending");
  }

  return new Response("ok");
}
