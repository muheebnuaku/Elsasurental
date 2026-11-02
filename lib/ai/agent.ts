import { tool } from "ai";
import { z } from "zod";
import { getDestinations, getFleet } from "@/lib/catalog";
import { getAvailability, fits } from "@/lib/availability";
import { allocateVans } from "@/lib/pricing/engine";
import { quoteTrip } from "@/lib/pricing/quote-trip";
import { tripRequestSchema, type TripRequest } from "@/lib/validators/trip";
import { searchKnowledge } from "@/lib/ai/knowledge";
import { whatsappLink } from "@/lib/format";
import { tripTypeLabels } from "@/lib/content";
import { bookingRules, site } from "@/lib/site";

// One agent for web chat now and WhatsApp in Phase 2. Tools call real internal functions only.

export function agentInstructions(now = new Date()) {
  return `You are Ama, the booking assistant for ${site.name}, a Ghanaian company renting 8- and 14-seater minivans, always with a professional driver, anywhere in Ghana.

How you talk
- Warm, friendly and concise, in Ghanaian English. You understand Pidgin and simple Twi phrases; reply in English unless the customer clearly prefers otherwise.
- Ask only for details that are missing, one or two at a time. Short messages; this is often read on a phone.
- Use the customer's words back to them. No long lists unless asked.

Hard rules
- NEVER state or estimate a price unless it came from the get_quote tool in this conversation. If asked "how much", collect the details and call get_quote.
- NEVER say a booking is confirmed or paid. Bookings are only confirmed after payment. When the customer is ready, call prepare_booking and give them the link.
- Never ask for or accept MoMo PINs, card numbers or passwords. Payment happens only through the secure Paystack link.
- Use search_knowledge_base for policy questions (cancellations, deposits, what's included). Don't invent policies.
- Offer a human whenever useful. Call handoff_to_human for complaints, refunds, cancellations of existing bookings, very large groups (over 40 people), or when you are unsure.
- Stay on topic: transport bookings with ${site.shortName}. Politely decline unrelated requests.

What get_quote needs
- trip type, pick-up place, date, time, number of passengers. For outstation trips also the destination; for half/full-day or events, roughly how many hours.
- If the customer says "tomorrow", "Saturday" etc., convert it to a date using today's date below.
- Passengers decide the van: 1-8 → 8-seater, 9-14 → 14-seater, more → several vans. Don't ask which van unless they have a preference.

After a quote
- Give the total and the ${bookingRules.depositPct}% deposit, mention what's included in one line, and note anything from the quote notes.
- If it says vans may not be available, suggest another time or a human.
- Ask if they'd like to book; if yes, ask for their name, then call prepare_booking.

Today is ${now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" })} (Africa/Accra, GMT). Current time ${now.toISOString().slice(11, 16)}.`;
}

function bookingLink(r: TripRequest, name?: string) {
  const p = new URLSearchParams({ trip: r.tripType, pax: String(r.passengers), from: r.pickup, date: r.date, time: r.time });
  if (r.dropoff) p.set("to", r.dropoff);
  if (r.destinationSlug) p.set("dest", r.destinationSlug);
  if (r.durationHours) p.set("hours", String(r.durationHours));
  if (r.days) p.set("days", String(r.days));
  if (r.stops.length) p.set("stops", r.stops.join("|"));
  if (name) p.set("name", name);
  return `${site.url}/book?${p}`;
}

export const agentTools = {
  get_quote: tool({
    description:
      "Get the exact price for a trip from Elsasu's pricing engine. The only source of prices. Returns line items, total, deposit, vans and availability.",
    inputSchema: tripRequestSchema,
    execute: async (input) => {
      const result = await quoteTrip(input);
      if (!result.ok) return { error: result.error };
      const { quote, available, distanceKm, destinationName, request } = result.data;
      return {
        trip: tripTypeLabels[quote.tripType],
        destination: destinationName,
        vans: quote.vans.map((v) => v.name),
        lines: quote.lines.map((l) => `${l.label}: GHS ${l.amount}`),
        total: `GHS ${quote.total}`,
        deposit: `GHS ${quote.deposit} (${bookingRules.depositPct}%)`,
        included: quote.included,
        distanceKm,
        available,
        notes: quote.notes,
        bookingLink: bookingLink(request),
      };
    },
  }),

  check_availability: tool({
    description: "Check whether enough vans are free for a group at a date/time, without pricing it.",
    inputSchema: z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      hours: z.number().min(1).max(240),
      passengers: z.number().int().min(1).max(60),
    }),
    execute: async ({ date, time, hours, passengers }) => {
      const fleet = await getFleet();
      const start = new Date(`${date}T${time}:00Z`);
      const end = new Date(start.getTime() + hours * 3600_000);
      const vans = allocateVans(passengers, fleet.map((t) => ({ id: t.id, slug: t.slug, name: t.name, seats: t.seats })));
      const availability = await getAvailability(start, end);
      return {
        needed: vans.map((v) => v.name),
        available: fits(vans.map((v) => ({ vehicleTypeId: v.id })), availability),
        freeByType: fleet.map((t) => ({ van: t.name, free: availability[t.id]?.free ?? 0 })),
      };
    },
  }),

  list_destinations: tool({
    description: "List popular fixed-price destinations from Accra (names, regions, drive time). Use get_quote for prices.",
    inputSchema: z.object({}),
    execute: async () =>
      (await getDestinations()).map((d) => ({ slug: d.slug, name: d.name, region: d.region, hoursEachWay: d.est_hours })),
  }),

  search_knowledge_base: tool({
    description: "Search Elsasu's FAQs and policies (cancellation, deposits, what's included, contact, services).",
    inputSchema: z.object({ query: z.string().min(2).max(200) }),
    execute: async ({ query }) => {
      const hits = searchKnowledge(query);
      return hits.length ? hits : { result: "Nothing found. Offer to connect the customer with a human." };
    },
  }),

  prepare_booking: tool({
    description:
      "When the customer wants to book: re-checks the quote and returns a secure booking link (and a WhatsApp option). This does NOT confirm the booking.",
    inputSchema: tripRequestSchema.extend({ customerName: z.string().trim().min(2).max(80) }),
    execute: async ({ customerName, ...trip }) => {
      const result = await quoteTrip(trip);
      if (!result.ok) return { error: result.error };
      const { quote, request, available } = result.data;
      if (!available) return { error: "Not enough vans free at that time. Suggest another time or a human." };
      return {
        bookingLink: bookingLink(request, customerName),
        total: `GHS ${quote.total}`,
        deposit: `GHS ${quote.deposit}`,
        whatsapp: whatsappLink(
          `Hi Elsasu, I'm ${customerName}. I'd like to book: ${tripTypeLabels[quote.tripType]}, ${quote.passengers} passengers, from ${request.pickup}${request.dropoff ? ` to ${request.dropoff}` : ""}, ${request.date} at ${request.time}. Quoted GHS ${quote.total}.`,
        ),
        note: "Booking is confirmed only after the deposit is paid.",
      };
    },
  }),

  handoff_to_human: tool({
    description: "Connect the customer with a human at Elsasu (WhatsApp/phone). Use for complaints, refunds, changes to existing bookings, or when unsure.",
    inputSchema: z.object({ reason: z.string().max(300) }),
    execute: async ({ reason }) => ({
      whatsapp: whatsappLink(`Hi Elsasu, I was chatting with your assistant and need help: ${reason}`),
      phone: site.phone,
      message: "A team member will reply on WhatsApp, usually within minutes during the day.",
    }),
  }),
};
