import { formatDateTime, formatMoney } from "@/lib/format";
import { formatGhanaPhone } from "@/lib/phone";
import { site } from "@/lib/site";
import { defaultBusiness, type Business } from "@/lib/business-defaults";

// Every customer message in one place. SMS text, WhatsApp template parameters and email share the same facts.
// WhatsApp business-initiated messages must use templates approved in Meta; names/params are listed in the README.

export type NotifyEvent =
  | "booking_confirmed"
  | "payment_received"
  | "driver_assigned"
  | "reminder_24h"
  | "reminder_1h"
  | "trip_started"
  | "trip_completed"
  | "review_request"
  | "booking_cancelled";

export type MessageContext = {
  ref: string;
  firstName: string;
  trip: string;
  startAt: string;
  pickup: string;
  total: number;
  paid: number;
  balance: number;
  link: string;
  driverName?: string | null;
  driverPhone?: string | null;
  vanPlate?: string | null;
  amount?: number; // payment or refund amount for this event
  trackingLink?: string | null;
  /** Live contact details (Admin → Business); falls back to the defaults. */
  business?: Business;
};

export type Message = {
  sms: string;
  whatsapp: { template: string; params: string[] };
  email: { subject: string; text: string };
};

const money = (n: number) => formatMoney(n).replace("GH₵", "GHS ");
const when = (iso: string) => formatDateTime(iso);
const balanceNote = (c: MessageContext) => (c.balance > 0 ? ` Balance ${money(c.balance)} due before the trip.` : " Paid in full.");

export function buildMessage(event: NotifyEvent, c: MessageContext): Message {
  const biz = c.business ?? defaultBusiness;
  const hi = `Hi ${c.firstName}`;
  const driver = c.driverName ? `${c.driverName}${c.driverPhone ? ` (${formatGhanaPhone(c.driverPhone)})` : ""}` : "your driver";
  const sms = (() => {
    switch (event) {
      case "booking_confirmed":
        return `${hi}, your Elsasu booking ${c.ref} is confirmed: ${c.trip}, ${when(c.startAt)}, pick-up ${c.pickup}. Paid ${money(c.paid)}.${balanceNote(c)} ${c.link}`;
      case "payment_received":
        return `${hi}, we received ${money(c.amount ?? 0)} for booking ${c.ref}.${balanceNote(c)} Receipt: ${c.link}`;
      case "driver_assigned":
        return `${hi}, ${driver} will drive you for ${c.ref} on ${when(c.startAt)}${c.vanPlate ? ` in van ${c.vanPlate}` : ""}.`;
      case "reminder_24h":
        return `${hi}, reminder: your Elsasu van (${c.ref}) picks you up tomorrow, ${when(c.startAt)}, at ${c.pickup}.${balanceNote(c)} ${c.link}`;
      case "reminder_1h":
        return `${hi}, your Elsasu van arrives in about an hour at ${c.pickup}. Driver: ${driver}.${c.trackingLink ? ` Track: ${c.trackingLink}` : ""}`;
      case "trip_started":
        return `${hi}, ${driver} is on the way for ${c.ref}.${c.trackingLink ? ` Share live tracking with your group: ${c.trackingLink}` : ""}`;
      case "trip_completed":
        return `${hi}, thanks for riding with Elsasu (${c.ref}). We hope everyone arrived happy!`;
      case "review_request":
        return `${hi}, how was your Elsasu trip ${c.ref}? Rate us in 10 seconds: ${c.link}`;
      case "booking_cancelled":
        return `${hi}, booking ${c.ref} is cancelled.${c.amount ? ` Refund of ${money(c.amount)} goes back to your original payment method within 5–10 working days.` : ""} Questions? ${formatGhanaPhone(biz.phone)}`;
    }
  })();

  // Template parameters, in order ({{1}}, {{2}}, …). Keep in sync with the templates created in Meta.
  const params: Record<NotifyEvent, string[]> = {
    booking_confirmed: [c.firstName, c.ref, c.trip, when(c.startAt), c.pickup, money(c.paid), money(c.balance)],
    payment_received: [c.firstName, money(c.amount ?? 0), c.ref, money(c.balance)],
    driver_assigned: [c.firstName, c.driverName ?? "Your driver", c.driverPhone ? formatGhanaPhone(c.driverPhone) : "-", c.ref, when(c.startAt), c.vanPlate ?? "-"],
    reminder_24h: [c.firstName, c.ref, when(c.startAt), c.pickup, money(c.balance)],
    reminder_1h: [c.firstName, c.pickup, c.driverName ?? "your driver", c.trackingLink ?? c.link],
    trip_started: [c.firstName, c.driverName ?? "Your driver", c.ref, c.trackingLink ?? c.link],
    trip_completed: [c.firstName, c.ref],
    review_request: [c.firstName, c.ref, c.link],
    booking_cancelled: [c.firstName, c.ref, money(c.amount ?? 0)],
  };

  const subjects: Record<NotifyEvent, string> = {
    booking_confirmed: `Booking confirmed: ${c.ref}`,
    payment_received: `Payment received for ${c.ref}`,
    driver_assigned: `Your driver for ${c.ref}`,
    reminder_24h: `Tomorrow: your Elsasu van (${c.ref})`,
    reminder_1h: `Your van arrives soon (${c.ref})`,
    trip_started: `On the way (${c.ref})`,
    trip_completed: `Thanks for riding with Elsasu`,
    review_request: `How was your trip? (${c.ref})`,
    booking_cancelled: `Booking cancelled: ${c.ref}`,
  };

  return {
    sms,
    whatsapp: { template: `elsasu_${event}`, params: params[event] },
    email: { subject: subjects[event], text: `${sms}\n\n${site.name} · ${formatGhanaPhone(biz.phone)} · ${biz.email}` },
  };
}

/** "+233241234567" → "+23324•••4567" for logs. */
export const maskPhone = (p: string) => (p.length > 8 ? `${p.slice(0, 6)}•••${p.slice(-4)}` : "•••");
