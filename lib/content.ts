import { bookingRules, cancellationPolicy } from "@/lib/site";
import type { TripType } from "@/lib/catalog";

// Marketing copy. No prices here — prices always come from the database.

export const tripTypeLabels: Record<TripType, string> = {
  airport: "Airport transfer",
  half_day: "Half day",
  full_day: "Full day",
  multi_day: "Multi-day",
  outstation: "Outstation trip",
  event: "Event / occasion",
  corporate_shuttle: "Staff shuttle",
};

export const tripTypeHints: Record<TripType, string> = {
  airport: "Kotoka (ACC) pick-up or drop-off",
  half_day: "Errands, city tours, meetings",
  full_day: "A whole day with your driver",
  multi_day: "Tours and trips over several days",
  outstation: "Cape Coast, Kumasi, Akosombo…",
  event: "Weddings, funerals, church",
  corporate_shuttle: "Recurring staff transport",
};

export const services = [
  {
    slug: "airport",
    trip: "airport" as TripType,
    icon: "plane",
    title: "Airport transfers",
    blurb:
      "Meet-and-greet at Kotoka with room for the whole family and every suitcase. We track your flight, so delays don't cost you.",
    points: ["Flight tracking", "Name-board pick-up", "Room for 10+ bags"],
  },
  {
    slug: "weddings",
    trip: "event" as TripType,
    icon: "heart",
    title: "Weddings & engagements",
    blurb:
      "Move the bridal party and guests between the ceremony, photos and reception, on time and looking sharp.",
    points: ["Optional decorations", "Multiple vans, one booking", "Smart, courteous drivers"],
  },
  {
    slug: "funerals",
    trip: "event" as TripType,
    icon: "flower",
    title: "Funerals & one-week",
    blurb:
      "Respectful, reliable transport for family and mourners, including long trips to hometowns.",
    points: ["Early starts", "Hometown & outstation trips", "Calm, experienced drivers"],
  },
  {
    slug: "church",
    trip: "full_day" as TripType,
    icon: "church",
    title: "Church & group outings",
    blurb:
      "Retreats, conventions, crusades and youth trips. One 14-seater moves a whole ministry team.",
    points: ["14 seats per van", "Group discounts on request", "Day or multi-day"],
  },
  {
    slug: "tours",
    trip: "outstation" as TripType,
    icon: "map",
    title: "Tours & diaspora visits",
    blurb:
      "Cape Coast, Kakum, Akosombo, Kumasi and more, with a driver who knows the road and the stops worth making.",
    points: ["Fixed prices to top destinations", "Multi-day tours", "Pay in GHS or USD"],
  },
  {
    slug: "corporate",
    trip: "corporate_shuttle" as TripType,
    icon: "briefcase",
    title: "Corporate & staff shuttles",
    blurb:
      "Daily staff runs, offsites and conference transport, with monthly invoicing for company accounts.",
    points: ["Recurring schedules", "Monthly invoices", "Dedicated account contact"],
  },
] as const;

export const howItWorks = [
  {
    title: "Get an instant quote",
    body: "Tell us where, when and how many. You'll see the full price breakdown straight away, for any route.",
  },
  {
    title: "Pay with MoMo or card",
    body: `Secure a van with a ${bookingRules.depositPct}% deposit via MTN, Telecel, AirtelTigo or card. Booking confirmed instantly.`,
  },
  {
    title: "Ride and track live",
    body: "Your driver's details arrive on WhatsApp. Share a live tracking link with the whole group.",
  },
] as const;

export const whyElsasu = [
  { title: "The right vehicle", body: "7-seater SUVs for comfort, 8 and 14-seater vans for groups. One booking, everyone arrives together." },
  { title: "Any route, instant price", body: "No fixed packages. Quote any pick-up, stops and drop-off in seconds." },
  { title: "Pay your way", body: "Mobile Money or card, deposit now and balance later." },
  { title: "Professional drivers", body: "Licensed, vetted and rated after every trip." },
  { title: "Live tracking", body: "Know exactly where your van is, and share it with the group." },
  { title: "Help 24/7", body: "Our booking assistant answers on WhatsApp and web, any time." },
] as const;

const policyText = cancellationPolicy
  .map((p, i, all) => {
    if (p.minHoursBefore === 0) return `no refund less than ${all[i - 1]?.minHoursBefore ?? 24} hours before`;
    if (i === 0) return `${p.refundPct}% refund more than ${p.minHoursBefore} hours before pick-up`;
    return `${p.refundPct}% between ${p.minHoursBefore}–${all[i - 1]?.minHoursBefore} hours`;
  })
  .join(", ");

export const faqs = [
  {
    q: "Can I drive the vehicle myself?",
    a: "No. Every vehicle, van or SUV, comes with a professional, licensed Elsasu driver, and only our driver may drive it. Fuel for the quoted distance and the driver's time are included in your price.",
  },
  {
    q: "Which vehicle do I need?",
    a: "Up to 8 passengers fits our 8-seater van; 9–14 passengers fits the 14-seater. For 15 or more we send several vans on one booking. For more comfort with a smaller group, choose a 7-seater SUV (such as a Toyota Highlander or Acura). Tell us about your luggage too.",
  },
  {
    q: "How is the price calculated?",
    a: "Each trip type has a base price that includes a set number of kilometres and hours. Extra distance or time is charged at a clear per-km or per-hour rate, and trips between 10pm and 5am carry a small night surcharge. Popular destinations like Cape Coast or Kumasi have fixed prices. You always see the full breakdown before you pay.",
  },
  {
    q: "How do I pay?",
    a: `Online with Mobile Money (MTN, Telecel, AirtelTigo) or card through Paystack. Pay a ${bookingRules.depositPct}% deposit to confirm, or pay in full. We never ask for your MoMo PIN or card details by phone or chat.`,
  },
  {
    q: "What is your cancellation policy?",
    a: `Cancellations get a ${policyText}. Date or time changes are free up to ${cancellationPolicy[1]?.minHoursBefore ?? 24} hours before pick-up if a vehicle is available. Full details are in our terms.`,
  },
  {
    q: "Can I add stops on the way?",
    a: "Yes. Add as many stops as you like when booking. Each extra stop is a small add-on and the route distance is included in your quote.",
  },
  {
    q: "Do you go outside Accra?",
    a: "Everywhere in Ghana. We have fixed prices to the most popular destinations and instant quotes for any other route, including multi-day tours.",
  },
  {
    q: "Can my company get an account?",
    a: "Yes. Corporate accounts get monthly invoicing, agreed discounts and a dashboard of all staff trips. Contact us to set one up.",
  },
] as const;

/** Instant one-tap picks for pick-up / drop-off before the customer types anything. */
export const popularPlaces = [
  "Kotoka International Airport (T3)",
  "East Legon",
  "Airport Residential",
  "Osu",
  "Spintex",
  "Cantonments",
  "Madina",
  "Tema Community 1",
  "Kasoa",
  "Accra Mall",
] as const;
