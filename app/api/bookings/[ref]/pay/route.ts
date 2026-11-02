import { z } from "zod";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { startPayment } from "@/lib/booking/service";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

// POST /api/bookings/:ref/pay — retry a failed payment or pay the balance. Owner only (RLS check).
const schema = z.object({ payment: z.enum(["deposit", "full"]).default("deposit") });

export async function POST(req: Request, { params }: RouteContext<"/api/bookings/[ref]/pay">) {
  const rl = rateLimit(`pay:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });

  const { ref } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  // Visible through RLS only if this booking belongs to the caller (or they're an admin).
  const supabase = await createClient();
  const { data: booking } = await supabase.from("bookings").select("id, group_id").eq("ref_code", ref).maybeSingle();
  if (!booking) return Response.json({ error: "Booking not found." }, { status: 404 });

  // Payments always attach to the group's first booking.
  let leadId = booking.id;
  if (booking.group_id) {
    const { data: lead } = await supabase.from("bookings").select("id").eq("group_id", booking.group_id).order("created_at").limit(1).single();
    leadId = lead?.id ?? booking.id;
  }

  const pay = await startPayment(leadId, parsed.data.payment);
  if (!pay.ok) return Response.json({ error: pay.error }, { status: pay.status });
  return Response.json({ url: pay.data.url });
}
