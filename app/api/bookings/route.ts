import { z } from "zod";
import { getSessionUser, createClient } from "@/lib/supabase/server";
import { createBookingFromQuote, startPayment } from "@/lib/booking/service";
import { paystackConfigured } from "@/lib/payments/paystack";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

// POST /api/bookings — signed-in customer (phone verified by OTP) books a quoted trip and is sent to Paystack.
const schema = z.object({
  quoteToken: z.string().min(20).max(20_000),
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(120)]).optional(),
  notes: z.string().trim().max(1000).optional(),
  payment: z.enum(["deposit", "full"]),
});

export async function POST(req: Request) {
  const rl = rateLimit(`book:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  // Check payments are switched on before holding any van.
  if (!paystackConfigured()) {
    return Response.json({ error: "Online payment isn't switched on yet. Please send your booking to us on WhatsApp." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user?.phone) return Response.json({ error: "Please verify your phone number first." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Check your details." }, { status: 400 });
  const { quoteToken, name, email, notes, payment } = parsed.data;

  // Keep the customer's profile up to date (RLS: own row only).
  if (!user.fullName || (email && !user.email)) {
    const supabase = await createClient();
    await supabase.from("profiles").update({ full_name: user.fullName ?? name, ...(email && !user.email ? { email } : {}) }).eq("id", user.id);
  }

  const booking = await createBookingFromQuote({ customerId: user.id, phone: user.phone, name, email, notes, quoteToken });
  if (!booking.ok) return Response.json({ error: booking.error }, { status: booking.status });

  const pay = await startPayment(booking.data.leadId, payment);
  if (!pay.ok) return Response.json({ error: pay.error, ref: booking.data.ref }, { status: pay.status });
  return Response.json({ ref: booking.data.ref, url: pay.data.url });
}
