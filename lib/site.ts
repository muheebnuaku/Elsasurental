// Business-wide constants. Prices never live here — they come from the database.

export const site = {
  name: "Elsasu Rentals Services",
  shortName: "Elsasu",
  tagline: "Rent Smart. Drive Better.",
  description:
    "Chauffeur-driven minivans and SUVs across Ghana, always with a professional driver. Instant quotes for any route, MoMo or card payment, live tracking.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // Fallback contact details only. The live ones are edited in Admin → Business (business_settings).
  phone: "+233545415019",
  whatsapp: "+233545415019",
  email: "bookings@elsasu.com",
  address: "Accra, Ghana",
  timezone: "Africa/Accra",
  defaultCurrency: "GHS",
  locale: "en-GH",
} as const;

export const bookingRules = {
  // TODO(confirm): deposit percentage
  depositPct: 30,
  // TODO(confirm): turnaround buffer between trips (also enforced in the DB constraint)
  turnaroundMinutes: 60,
  quoteTtlMinutes: 30,
  // Night surcharge window, Accra local time (GMT, no DST)
  nightStartHour: 22,
  nightEndHour: 5,
  // TODO(confirm): waiting time, no-show, lost property and complaint windows (used in the terms).
  freeWaitMinutes: 15, // ordinary pick-ups
  airportFreeWaitMinutes: 60, // after the flight actually lands
  noShowMinutes: 60, // after the free wait, with no contact
  lostPropertyDays: 30,
  complaintDays: 7,
  // Confirmed by the owner: every vehicle comes with an Elsasu driver. No self-drive.
  selfDriveOffered: false,
} as const;

// TODO(confirm): cancellation policy. Default: full refund > 48h, 50% 24–48h, none < 24h.
export const cancellationPolicy = [
  { minHoursBefore: 48, refundPct: 100 },
  { minHoursBefore: 24, refundPct: 50 },
  { minHoursBefore: 0, refundPct: 0 },
] as const;
