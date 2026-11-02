import { faqs, services } from "@/lib/content";
import { bookingRules, cancellationPolicy } from "@/lib/site";
import { defaultBusiness, type Business } from "@/lib/business-defaults";

// Small keyword search over FAQs and policies. Phase 2 replaces this with pgvector over kb_documents.

type Doc = { title: string; content: string };

const docs: Doc[] = [
  ...faqs.map((f) => ({ title: f.q, content: f.a })),
  ...services.map((s) => ({ title: s.title, content: `${s.blurb} ${s.points.join(". ")}.` })),
  {
    title: "Cancellation policy",
    content: cancellationPolicy
      .map((p) => (p.minHoursBefore > 0 ? `${p.refundPct}% refund if cancelled ${p.minHoursBefore}+ hours before pick-up` : "no refund within 24 hours"))
      .join("; "),
  },
  {
    title: "Deposit and payment",
    content: `A ${bookingRules.depositPct}% deposit confirms a booking; the balance is due before the trip. Payment is by Mobile Money (MTN, Telecel, AirtelTigo) or card via a secure Paystack link. Never share a MoMo PIN or card number in chat.`,
  },
  { title: "Self-drive", content: "Every vehicle (vans and SUVs) comes with a professional Elsasu driver. Self-drive is never offered, and customers may not drive Elsasu vehicles." },
];

const words = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/** Contact details come from Admin → Business, so they're added per search. */
const contactDoc = (b: Business): Doc => ({
  title: "Contact and hours",
  content: `Phone ${b.phone}, WhatsApp ${b.whatsapp}, email ${b.email}. Based in ${b.address}. Online bookings 24/7.`,
});

export function searchKnowledge(query: string, limit = 3, business: Business = defaultBusiness): Doc[] {
  const q = new Set(words(query).filter((w) => w.length > 2));
  return [...docs, contactDoc(business)]
    .map((d) => ({ d, score: words(`${d.title} ${d.title} ${d.content}`).filter((w) => q.has(w)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.d);
}
