import { generateText, Output } from "ai";
import { z } from "zod";
import { aiConfigured, chatModel, chatProviderOptions } from "@/lib/ai/provider";
import { getDestinations } from "@/lib/catalog";
import { tripTypes } from "@/lib/validators/trip";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { reportError } from "@/lib/observability";

export const maxDuration = 30;

// Everything optional: the AI fills what it can, the form asks for the rest. No prices here.
const parsedTripSchema = z.object({
  tripType: z.enum(tripTypes).nullable(),
  passengers: z.number().int().min(1).max(60).nullable(),
  pickup: z.string().nullable(),
  dropoff: z.string().nullable(),
  stops: z.array(z.string()),
  destinationSlug: z.string().nullable().describe("Only if the destination matches one of the listed slugs"),
  date: z.string().nullable().describe("YYYY-MM-DD"),
  time: z.string().nullable().describe("HH:MM, 24-hour"),
  durationHours: z.number().nullable(),
  days: z.number().int().nullable(),
  roundTrip: z.boolean().nullable(),
  luggage: z.number().int().nullable(),
  notes: z.string().nullable().describe("Anything else useful for the driver, e.g. flight number"),
  missing: z.array(z.string()).describe("Short, friendly names of important details the customer did not give"),
});

const bodySchema = z.object({ text: z.string().trim().min(5).max(1000) });

export async function POST(req: Request) {
  if (!aiConfigured()) return Response.json({ error: "AI is offline. Please fill the form below." }, { status: 503 });
  const rl = rateLimit(`parse:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Tell us a bit more about your trip." }, { status: 400 });

  const destinations = await getDestinations();
  const now = new Date();

  try {
    const { output } = await generateText({
      model: chatModel(),
      providerOptions: chatProviderOptions,
      output: Output.object({ schema: parsedTripSchema }),
      instructions: `Extract van-hire booking details for Elsasu Rentals (Ghana) from the customer's message.
Today is ${now.toISOString().slice(0, 10)} (${now.toLocaleDateString("en-GB", { weekday: "long", timeZone: "Africa/Accra" })}), Africa/Accra (GMT). Resolve relative dates ("Saturday", "tomorrow") to YYYY-MM-DD in the future.
Trip types: airport (to/from Kotoka/ACC), half_day (up to ~5h around town), full_day (~10h), multi_day (several days), outstation (trip out of Accra), event (wedding, funeral, party, church event), corporate_shuttle (staff transport).
Fixed-price destinations (slug: name): ${destinations.map((d) => `${d.slug}: ${d.name}`).join(", ")}.
If the trip is to one of them, set destinationSlug and tripType "outstation". Use null for anything not stated; never guess numbers. Understand Pidgin and simple Twi.`,
      prompt: parsed.data.text,
    });
    return Response.json(output);
  } catch (e) {
    reportError("ai.parse-trip", e);
    return Response.json({ error: "Couldn't read that. Please fill the form below." }, { status: 502 });
  }
}
