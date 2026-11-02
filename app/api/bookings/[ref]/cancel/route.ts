import { z } from "zod";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { cancelBooking } from "@/lib/booking/cancel";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

// POST /api/bookings/:ref/cancel — the customer cancels; refund follows the cancellation policy.
const schema = z.object({ reason: z.string().trim().max(300).optional() });

export async function POST(req: Request, { params }: RouteContext<"/api/bookings/[ref]/cancel">) {
  const rl = rateLimit(`cancel:${clientIp(req)}`, 5, 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  // RLS: only the booking's owner (or an admin) can see it, so only they can cancel it.
  const { ref } = await params;
  const supabase = await createClient();
  const { data: booking } = await supabase.from("bookings").select("id, group_id").eq("ref_code", ref).maybeSingle();
  if (!booking) return Response.json({ error: "Booking not found." }, { status: 404 });
  let leadId = booking.id;
  if (booking.group_id) {
    const { data: lead } = await supabase.from("bookings").select("id").eq("group_id", booking.group_id).order("created_at").limit(1).single();
    leadId = lead?.id ?? booking.id;
  }

  const result = await cancelBooking(leadId, parsed.data.reason || `Cancelled by ${user.role === "admin" ? "admin" : "customer"}`);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ refund: result.refund, pct: result.pct });
}
