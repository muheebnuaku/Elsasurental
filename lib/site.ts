// Business-wide constants. Prices never live here — they come from the database.

export const site = {
  name: "Elsasu Rentals Services",
  shortName: "Elsasu",
  tagline: "Rent Smart. Drive Better.",
  description:
    "8- and 14-seater minivans with professional drivers across Ghana. Instant quotes for any route, MoMo payment, live tracking.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // TODO(confirm): real business phone, WhatsApp number, email and address
  phone: "+233200000000",
  whatsapp: "+233200000000",
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
  // TODO(confirm): self-drive. Default is driver-only.
  selfDriveOffered: false,
} as const;

// TODO(confirm): cancellation policy. Default: full refund > 48h, 50% 24–48h, none < 24h.
export const cancellationPolicy = [
  { minHoursBefore: 48, refundPct: 100 },
  { minHoursBefore: 24, refundPct: 50 },
  { minHoursBefore: 0, refundPct: 0 },
] as const;
