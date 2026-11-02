import { z } from "zod";

// Shared by the booking form, the quote API and the AI tools.

export const tripTypes = [
  "airport", "half_day", "full_day", "multi_day", "outstation", "event", "corporate_shuttle",
] as const;

export const tripRequestSchema = z.object({
  tripType: z.enum(tripTypes),
  passengers: z.number().int().min(1).max(60),
  pickup: z.string().trim().min(2, "Where should we pick you up?").max(200),
  dropoff: z.string().trim().max(200).optional(),
  stops: z.array(z.string().trim().min(2).max(200)).max(8).default([]),
  /** Fixed-price outstation destination slug, e.g. "cape-coast". */
  destinationSlug: z.string().max(60).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/).default("08:00"),
  durationHours: z.number().min(0.5).max(24).optional(),
  days: z.number().int().min(1).max(30).optional(),
  roundTrip: z.boolean().optional(),
  luggage: z.number().int().min(0).max(100).optional(),
  vehicleTypeSlug: z.string().max(40).optional(),
  addons: z.array(z.object({ slug: z.string().max(60), qty: z.number().int().min(1).max(20) })).max(10).default([]),
  promoCode: z.string().trim().toUpperCase().max(30).optional(),
});

export type TripRequest = z.infer<typeof tripRequestSchema>;
export type TripRequestInput = z.input<typeof tripRequestSchema>;
