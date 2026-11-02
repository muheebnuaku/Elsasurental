import { faqs, services } from "@/lib/content";
import { bookingRules, cancellationPolicy, site } from "@/lib/site";

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
  {
    title: "Contact and hours",
    content: `Phone ${site.phone}, WhatsApp ${site.whatsapp}, email ${site.email}. Based in ${site.address}. Online bookings 24/7.`,
  },
  { title: "Self-drive", content: "All vans come with a professional driver. Self-drive is not offered." },
];

const words = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];

export function searchKnowledge(query: string, limit = 3): Doc[] {
  const q = new Set(words(query).filter((w) => w.length > 2));
  return docs
    .map((d) => ({ d, score: words(`${d.title} ${d.title} ${d.content}`).filter((w) => q.has(w)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.d);
}
