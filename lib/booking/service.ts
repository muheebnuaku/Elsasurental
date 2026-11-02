import { randomBytes } from "node:crypto";
import { getAddons, getDestinations } from "@/lib/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyQuoteToken } from "@/lib/pricing/token";
import { vanBookingAmounts } from "@/lib/booking/allocate";
import { initializeTransaction, paystackConfigured, paystackEmail } from "@/lib/payments/paystack";
import { site } from "@/lib/site";
import type { TripQuote } from "@/lib/pricing/quote-trip";
import type { Json } from "@/types/supabase";
import { reportError } from "@/lib/observability";

type QuotePayload = Omit<TripQuote, "quoteToken" | "expiresInMinutes">;
export type PayChoice = "deposit" | "full";
type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

const place = (address?: string) => (address ? { address } : null);

/** Turn a signed quote into booking(s). Prices come only from the signed token, never from the browser. */
export async function createBookingFromQuote(input: {
  customerId: string | null;
  phone: string;
  name: string;
  email?: string | null;
  notes?: string | null;
  quoteToken: string;
  /** "admin" for phone/WhatsApp bookings entered by staff. */
  source?: "web" | "admin";
  /** How long an unpaid booking keeps its van (website: 30 min). */
  holdMinutes?: number;
}): Promise<Result<{ leadId: string; ref: string; total: number; deposit: number }>> {
  const payload = verifyQuoteToken<QuotePayload>(input.quoteToken);
  if (!payload) return { ok: false, status: 410, error: "Your price has expired. We've refreshed it — please check and try again." };
  if (!payload.available) return { ok: false, status: 409, error: "Those vehicles are no longer free at that time. Please pick another time." };

  const { quote, request } = payload;
  const [destinations, addons] = await Promise.all([getDestinations(), getAddons()]);
  const days = request.tripType === "multi_day" ? request.days ?? 1 : 1;

  const wanted = [
    ...request.addons.filter((a) => a.slug !== "extra-stop"),
    ...(request.stops.length ? [{ slug: "extra-stop", qty: request.stops.length }] : []),
  ];
  const addonRows = wanted.flatMap((a) => {
    const addon = addons.find((x) => x.slug === a.slug);
    if (!addon) return [];
    const qty = addon.unit === "per_trip" ? 1 : addon.unit === "per_day" ? days * a.qty : a.qty;
    return [{ addon_id: addon.id, qty, unit_price: addon.price }];
  });

  const db = createAdminClient();
  let promoId: string | null = null;
  if (request.promoCode && quote.lines.some((l) => l.label.startsWith("Promo "))) {
    const { data } = await db.from("promo_codes").select("id").eq("code", request.promoCode).maybeSingle();
    promoId = data?.id ?? null;
  }

  const { data, error } = await db.rpc("create_booking", {
    p_customer_id: input.customerId as string,
    p_contact_name: input.name,
    p_contact_phone: input.phone,
    p_contact_email: input.email ?? "",
    p_trip_type: quote.tripType,
    p_destination_id: destinations.find((d) => d.slug === request.destinationSlug)?.id ?? (null as unknown as string),
    p_pickup: place(request.pickup) as Json,
    p_dropoff: place(request.dropoff) as Json,
    p_stops: request.stops.map((s) => ({ address: s })) as Json,
    p_start_at: payload.startAt,
    p_end_at: payload.endAt,
    p_luggage: request.luggage ?? 0,
    p_vans: vanBookingAmounts(quote) as unknown as Json,
    p_addons: addonRows as Json,
    p_promo_code_id: promoId as unknown as string,
    p_distance_km: payload.distanceKm as unknown as number,
    p_quote: { lines: quote.lines, notes: quote.notes, included: quote.included, request } as unknown as Json,
    p_source: input.source ?? "web",
    p_hold_minutes: input.holdMinutes ?? 30,
    p_notes: input.notes ?? "",
  });

  if (error) {
    if (error.message.includes("NO_VAN_AVAILABLE")) {
      return { ok: false, status: 409, error: "Sorry, those vehicles were just booked. Please pick another time." };
    }
    console.error("[booking] create failed", error.message);
    return { ok: false, status: 500, error: "We couldn't save your booking. Please try again." };
  }
  const lead = data?.[0];
  if (!lead) return { ok: false, status: 500, error: "We couldn't save your booking. Please try again." };
  return { ok: true, data: { leadId: lead.booking_id, ref: lead.ref_code, total: quote.total, deposit: quote.deposit } };
}

/** Sum of what's due across a booking's group (one van or several). */
export async function groupMoney(leadId: string) {
  const db = createAdminClient();
  const { data: lead } = await db.from("bookings").select("id, group_id, ref_code, status, hold_expires_at, contact_email, contact_phone").eq("id", leadId).single();
  if (!lead) return null;
  const { data: rows } = lead.group_id
    ? await db.from("bookings").select("total, amount_paid, deposit_amount, status").eq("group_id", lead.group_id)
    : await db.from("bookings").select("total, amount_paid, deposit_amount, status").eq("id", lead.id);
  const live = (rows ?? []).filter((r) => !["cancelled", "refunded"].includes(r.status));
  const sum = (k: "total" | "amount_paid" | "deposit_amount") => Math.round(live.reduce((s, r) => s + Number(r[k]), 0) * 100) / 100;
  return { lead, total: sum("total"), paid: sum("amount_paid"), deposit: sum("deposit_amount"), cancelled: live.length === 0 };
}

/** Create a pending payment and send the customer to Paystack. */
export async function startPayment(leadId: string, choice: PayChoice | "balance"): Promise<Result<{ url: string; ref: string }>> {
  if (!paystackConfigured()) {
    return { ok: false, status: 503, error: "Online payment isn't switched on yet. Please reserve on WhatsApp." };
  }
  const money = await groupMoney(leadId);
  if (!money || money.cancelled) return { ok: false, status: 409, error: "This booking is no longer active." };

  const due = Math.round((money.total - money.paid) * 100) / 100;
  if (due <= 0) return { ok: false, status: 409, error: "This booking is already paid in full." };

  const firstPayment = money.paid === 0;
  if (firstPayment && money.lead.status === "pending_payment" && money.lead.hold_expires_at && new Date(money.lead.hold_expires_at) < new Date()) {
    return { ok: false, status: 410, error: "The van hold expired. Please get a fresh price and book again." };
  }

  const kind = !firstPayment ? "balance" : choice === "full" ? "full" : "deposit";
  const amount = kind === "deposit" ? Math.min(money.deposit, due) : due;
  const reference = `${money.lead.ref_code}-${randomBytes(4).toString("hex").toUpperCase()}`;

  const db = createAdminClient();
  const { error } = await db.from("payments").insert({ booking_id: leadId, reference, kind, amount, status: "pending", provider: "paystack" });
  if (error) return { ok: false, status: 500, error: "Couldn't start the payment. Please try again." };

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: paystackEmail(money.lead.contact_email, money.lead.contact_phone),
      amountGhs: amount,
      reference,
      callbackUrl: `${site.url}/book/confirmation?ref=${money.lead.ref_code}`,
      metadata: { booking_ref: money.lead.ref_code, kind },
    });
    return { ok: true, data: { url: authorizationUrl, ref: money.lead.ref_code } };
  } catch (e) {
    await db.from("payments").update({ status: "failed" }).eq("reference", reference);
    reportError("payment.init", e, { reference });
    return { ok: false, status: 502, error: "Paystack is not responding. Please try again in a moment." };
  }
}
