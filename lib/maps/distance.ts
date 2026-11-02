import { cacheLife } from "next/cache";

// Road distance via Google Distance Matrix, cached for 24h per route.
// Returns null when no key is configured or Google can't find the route; pricing then falls back
// to "includes N km, extra km at X/km" instead of guessing a distance.

type Leg = { km: number; minutes: number };

async function legDistance(origin: string, destination: string): Promise<Leg | null> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 86_400, expire: 86_400 });

  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", origin);
  url.searchParams.set("destinations", destination);
  url.searchParams.set("region", "gh");
  url.searchParams.set("units", "metric");
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      rows?: { elements?: { status: string; distance?: { value: number }; duration?: { value: number } }[] }[];
    };
    const el = data.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK" || !el.distance || !el.duration) return null;
    return { km: el.distance.value / 1000, minutes: el.duration.value / 60 };
  } catch {
    return null;
  }
}

/** Total distance along pickup → stops → dropoff (and back again if `roundTrip`). */
export async function routeDistance(points: string[], roundTrip = false): Promise<Leg | null> {
  const stops = points.map((p) => p.trim()).filter(Boolean);
  if (stops.length < 2) return null;
  const path = roundTrip ? [...stops, stops[0]!] : stops;
  const legs = await Promise.all(path.slice(1).map((to, i) => legDistance(appendGhana(path[i]!), appendGhana(to))));
  if (legs.some((l) => l === null)) return null;
  return legs.reduce<Leg>((acc, l) => ({ km: acc.km + l!.km, minutes: acc.minutes + l!.minutes }), { km: 0, minutes: 0 });
}

const appendGhana = (place: string) => (/ghana/i.test(place) ? place : `${place}, Ghana`);
