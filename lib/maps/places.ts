import { cacheLife } from "next/cache";

// Address search + reverse geocoding, restricted to Ghana.
// Google Places (New) / Geocoding when GOOGLE_MAPS_SERVER_KEY is set, otherwise Photon (OpenStreetMap,
// free, allows search-as-you-type). TODO(confirm): Google key for production accuracy.

export type PlaceSuggestion = { label: string; detail?: string };

const PHOTON = "https://photon.komoot.io";
const GHANA_BBOX = "-3.26,4.74,1.2,11.17"; // minLon,minLat,maxLon,maxLat
const UA = { "User-Agent": "ElsasuRentals/1.0 (bookings@elsasu.com)" };

type PhotonFeature = {
  properties: { name?: string; street?: string; housenumber?: string; district?: string; locality?: string; city?: string; county?: string; state?: string; country?: string };
  geometry: { coordinates: [number, number] };
};

function photonLabel(p: PhotonFeature["properties"]) {
  const main = p.name ?? [p.housenumber, p.street].filter(Boolean).join(" ");
  const area = [p.district ?? p.locality, p.city ?? p.county, p.state].filter((x) => x && x !== main);
  return { label: main || area.shift() || "Unnamed place", detail: [...new Set(area)].slice(0, 2).join(", ") || undefined };
}

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  "use cache";
  cacheLife("hours");
  const q = query.trim();
  if (q.length < 3) return [];

  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  try {
    if (key) {
      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
        body: JSON.stringify({
          input: q,
          includedRegionCodes: ["gh"],
          locationBias: { circle: { center: { latitude: 5.6037, longitude: -0.187 }, radius: 50000 } },
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          suggestions?: { placePrediction?: { structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }[];
        };
        return (data.suggestions ?? [])
          .map((s) => s.placePrediction?.structuredFormat)
          .filter((f): f is NonNullable<typeof f> => Boolean(f?.mainText))
          .map((f) => ({ label: f.mainText!.text, detail: f.secondaryText?.text.replace(/,?\s*Ghana$/, "") || undefined }));
      }
    }
    const url = `${PHOTON}/api/?q=${encodeURIComponent(q)}&limit=6&lang=en&bbox=${GHANA_BBOX}`;
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: PhotonFeature[] };
    const seen = new Set<string>();
    return (data.features ?? [])
      .filter((f) => !f.properties.country || f.properties.country === "Ghana")
      .map((f) => photonLabel(f.properties))
      .filter((s) => {
        const k = `${s.label}|${s.detail}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  try {
    if (key) {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&region=gh&key=${key}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (res.ok) {
        const data = (await res.json()) as { results?: { formatted_address: string }[] };
        const addr = data.results?.[0]?.formatted_address;
        if (addr) return addr.replace(/,?\s*Ghana$/, "");
      }
    }
    const res = await fetch(`${PHOTON}/reverse?lat=${lat}&lon=${lng}&lang=en`, { headers: UA, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: PhotonFeature[] };
    const f = data.features?.[0];
    if (!f) return null;
    const { label, detail } = photonLabel(f.properties);
    return detail ? `${label}, ${detail}` : label;
  } catch {
    return null;
  }
}
