import { loadBookingGroup } from "@/lib/booking/details";
import { renderReceipt } from "@/lib/booking/receipt";

// GET /api/bookings/:ref/receipt — PDF receipt (owner or admin only, via RLS).
export async function GET(_req: Request, { params }: RouteContext<"/api/bookings/[ref]/receipt">) {
  const { ref } = await params;
  const g = await loadBookingGroup(ref);
  if (!g) return new Response("Not found", { status: 404 });
  if (g.paid <= 0) return new Response("A receipt is available once a payment is made.", { status: 409 });

  const pdf = await renderReceipt(g);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="elsasu-receipt-${ref}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
