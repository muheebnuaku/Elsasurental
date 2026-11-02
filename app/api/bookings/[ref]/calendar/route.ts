import { loadBookingGroup, place } from "@/lib/booking/details";
import { tripTypeLabels } from "@/lib/content";
import { getBusiness } from "@/lib/business";

// GET /api/bookings/:ref/calendar — .ics file for the trip (owner only, via RLS).
const ics = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

export async function GET(_req: Request, { params }: RouteContext<"/api/bookings/[ref]/calendar">) {
  const { ref } = await params;
  const g = await loadBookingGroup(ref);
  if (!g) return new Response("Not found", { status: 404 });

  const from = place(g.lead.pickup) ?? "";
  const to = place(g.lead.dropoff);
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Elsasu Rentals//Booking//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${g.lead.ref_code}@elsasu`,
    `DTSTAMP:${ics(new Date().toISOString())}`,
    `DTSTART:${ics(g.lead.start_at)}`,
    `DTEND:${ics(g.lead.end_at)}`,
    `SUMMARY:${esc(`Elsasu van: ${tripTypeLabels[g.lead.trip_type]} (${g.lead.ref_code})`)}`,
    `LOCATION:${esc(from)}`,
    `DESCRIPTION:${esc(`Pick-up: ${from}${to ? `\nDrop-off: ${to}` : ""}\nRef: ${g.lead.ref_code}\nHelp: ${(await getBusiness()).phone}`)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Your Elsasu van arrives in 2 hours",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="elsasu-${g.lead.ref_code}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
