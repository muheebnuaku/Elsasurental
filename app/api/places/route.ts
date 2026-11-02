import { z } from "zod";
import { reverseGeocode, searchPlaces } from "@/lib/maps/places";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

// GET /api/places?q=east legon        → { suggestions: [{ label, detail }] }
// GET /api/places?lat=5.6&lng=-0.18   → { label }
const searchSchema = z.object({ q: z.string().trim().min(3).max(120) });
const reverseSchema = z.object({
  lat: z.coerce.number().min(4.5).max(11.5), // roughly Ghana
  lng: z.coerce.number().min(-3.5).max(1.5),
});

export async function GET(req: Request) {
  const rl = rateLimit(`places:${clientIp(req)}`, 60, 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  const params = Object.fromEntries(new URL(req.url).searchParams);
  if ("lat" in params) {
    const parsed = reverseSchema.safeParse(params);
    if (!parsed.success) return Response.json({ error: "That location is outside Ghana." }, { status: 400 });
    const { lat, lng } = parsed.data;
    const label = await reverseGeocode(Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5);
    return Response.json({ label: label ?? `Pinned location (${lat.toFixed(5)}, ${lng.toFixed(5)})` });
  }

  const parsed = searchSchema.safeParse(params);
  if (!parsed.success) return Response.json({ suggestions: [] });
  return Response.json({ suggestions: await searchPlaces(parsed.data.q.toLowerCase()) });
}
