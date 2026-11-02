import { getAddons, getDestinations, getFleet } from "@/lib/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { routeDistance } from "@/lib/maps/distance";
import { getAvailability, fits } from "@/lib/availability";
import { bookingRules } from "@/lib/site";
import { getQuote, QuoteError, type PricingCatalog, type Promo, type Quote } from "@/lib/pricing/engine";
import { signQuoteToken } from "@/lib/pricing/token";
import type { TripRequest } from "@/lib/validators/trip";

export type TripQuote = {
  quote: Quote;
  request: TripRequest;
  startAt: string;
  endAt: string;
  distanceKm: number | null;
  available: boolean;
  destinationName: string | null;
  quoteToken: string;
  expiresInMinutes: number;
};

export type QuoteTripResult = { ok: true; data: TripQuote } | { ok: false; error: string };

async function loadCatalog(): Promise<PricingCatalog> {
  const [fleet, destinations, addons] = await Promise.all([getFleet(), getDestinations(), getAddons()]);
  return {
    vanTypes: fleet.map((t) => ({ id: t.id, slug: t.slug, name: t.name, seats: t.seats, category: t.category })),
    rules: fleet.flatMap((t) => t.pricing),
    destinations,
    addons,
  };
}

async function findPromo(code: string, now: Date): Promise<Promo | null> {
  const { data } = await createAdminClient()
    .from("promo_codes")
    .select("code, type, value, min_subtotal, valid_from, valid_to, max_uses, used_count")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  if (!data) return null;
  if (data.valid_from && new Date(data.valid_from) > now) return null;
  if (data.valid_to && new Date(data.valid_to) < now) return null;
  if (data.max_uses !== null && data.used_count >= data.max_uses) return null;
  return data;
}

/** The single entry point for prices: booking form, quote API and AI agent all call this. */
export async function quoteTrip(req: TripRequest, now = new Date()): Promise<QuoteTripResult> {
  const catalog = await loadCatalog();

  // Accra is GMT year-round, so local date + time is the UTC instant.
  const start = new Date(`${req.date}T${req.time}:00Z`);
  if (Number.isNaN(start.getTime())) return { ok: false, error: "That date or time isn't valid." };
  if (start.getTime() < now.getTime() + 60 * 60_000) {
    return { ok: false, error: "Pick-up needs to be at least 1 hour from now. For urgent trips, call or WhatsApp us." };
  }

  // A drop-off that names a fixed-price destination becomes an outstation trip at that price.
  let destinationSlug = req.destinationSlug;
  let tripType = req.tripType;
  if (!destinationSlug && req.dropoff) {
    const match = catalog.destinations.find((d) => d.name.toLowerCase() === req.dropoff!.toLowerCase().trim());
    if (match && (tripType === "outstation" || tripType === "full_day")) {
      destinationSlug = match.slug;
      tripType = "outstation";
    }
  }
  const destination = destinationSlug ? catalog.destinations.find((d) => d.slug === destinationSlug) : undefined;

  let distanceKm: number | null = null;
  if (!destination && req.dropoff) {
    const roundTrip = req.roundTrip ?? tripType === "outstation";
    const route = await routeDistance([req.pickup, ...req.stops, req.dropoff], roundTrip);
    distanceKm = route ? Math.round(route.km * 10) / 10 : null;
  }

  const promo = req.promoCode ? await findPromo(req.promoCode, now) : null;

  let quote: Quote;
  try {
    quote = getQuote(
      {
        tripType,
        passengers: req.passengers,
        vehicleTypeSlug: req.vehicleTypeSlug,
        startAt: start.toISOString(),
        durationHours: req.durationHours,
        days: req.days,
        distanceKm,
        destinationSlug,
        // Each stop is billed as one "extra stop" add-on, derived from the actual stops.
        addons: [
          ...req.addons.filter((a) => a.slug !== "extra-stop"),
          ...(req.stops.length ? [{ slug: "extra-stop", qty: req.stops.length }] : []),
        ],
        promo,
      },
      catalog,
      { depositPct: bookingRules.depositPct },
    );
  } catch (e) {
    if (e instanceof QuoteError) return { ok: false, error: e.message };
    throw e;
  }
  if (req.promoCode && !promo) quote.notes.push(`Promo code ${req.promoCode} isn't valid right now.`);

  // How long the van is blocked: the longer of what was asked and what's included.
  const hours =
    tripType === "multi_day"
      ? (req.days ?? 1) * 24
      : Math.max(req.durationHours ?? 0, quote.included.hours, 1);
  const end = new Date(start.getTime() + hours * 3600_000);

  const available = fits(quote.vans, await getAvailability(start, end));
  if (!available) quote.notes.push("We may not have enough vehicles free at that time. Try another time or chat with us.");

  const request: TripRequest = { ...req, tripType, destinationSlug };
  const data = {
    quote,
    request,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    distanceKm,
    available,
    destinationName: destination?.name ?? null,
  };
  return {
    ok: true,
    data: {
      ...data,
      quoteToken: signQuoteToken(data, bookingRules.quoteTtlMinutes, now.getTime()),
      expiresInMinutes: bookingRules.quoteTtlMinutes,
    },
  };
}
