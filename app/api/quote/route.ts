import { tripRequestSchema } from "@/lib/validators/trip";
import { quoteTrip } from "@/lib/pricing/quote-trip";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

// Live quote for the booking form. Returns the full breakdown + a signed quote token.
export async function POST(req: Request) {
  const rl = rateLimit(`quote:${clientIp(req)}`, 40, 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  const parsed = tripRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid trip details" }, { status: 400 });
  }

  const result = await quoteTrip(parsed.data);
  if (!result.ok) return Response.json({ error: result.error }, { status: 422 });
  return Response.json(result.data);
}
