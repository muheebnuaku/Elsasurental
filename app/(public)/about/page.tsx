import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, Building2, Clock, HeartHandshake, Mail, MapPin, Phone, ShieldCheck, Timer, Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Section, SectionHeading } from "@/components/site/section";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { faqs } from "@/lib/content";
import { site } from "@/lib/site";
import { stockPhotos } from "@/lib/stock-photos";
import { telLink, whatsappLink } from "@/lib/format";
import { formatGhanaPhone } from "@/lib/phone";

export const metadata: Metadata = {
  title: "About us, FAQs & contact",
  description: `${site.name}: who we are, answers to common questions, and every way to reach us. ${site.tagline}`,
};

const values = [
  { icon: Timer, title: "On time", body: "We plan around Accra traffic and arrive early." },
  { icon: ShieldCheck, title: "Safe hands", body: "Licensed, vetted drivers and serviced vans." },
  { icon: HeartHandshake, title: "Honest prices", body: "Full breakdown before you pay. No surprises." },
  { icon: Wind, title: "Clean & cool", body: "Air-conditioned and cleaned between trips." },
];

const jump = [
  { href: "#story", label: "Our story" },
  { href: "#faqs", label: "FAQs" },
  { href: "#contact", label: "Contact" },
];

// TODO(confirm): replace the story with the owner's own words, founding year and real photos.
export default function AboutPage() {
  const half = Math.ceil(faqs.length / 2);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="relative overflow-hidden bg-brand-ink text-white">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_100%_0%,rgba(234,88,12,0.25),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="font-display text-xl text-brand-orange-text italic">{site.tagline}</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            We get Ghana&apos;s groups moving together
          </h1>
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="On this page">
            {jump.map((j) => (
              <a key={j.href} href={j.href} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10">
                {j.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <Section id="story">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <SectionHeading eyebrow="Our story" title="Built for groups, not just four people" className="mb-4 sm:mb-5" />
            <div className="space-y-3 text-pretty text-muted-foreground sm:text-lg">
              <p>
                Most car hire in Ghana is built for four. Life here happens in groups: family visits, church
                retreats, weddings, funerals, team offsites.
              </p>
              <p>
                So we run 8- and 14-seater vans, each with a friendly professional driver, and made booking as easy
                as a WhatsApp message: instant price for any route, pay with MoMo, watch your van arrive.
              </p>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-2.5">
              {values.map(({ icon: Icon, title, body }) => (
                <li key={title} className="rounded-2xl border bg-card p-3.5">
                  <Icon className="size-5 text-brand-orange" />
                  <p className="mt-2 text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-5 gap-2.5">
            <div className="relative col-span-3 aspect-[4/5] overflow-hidden rounded-2xl">
              <Image src={stockPhotos.city} alt="Aerial view of a city in Ghana" fill sizes="(min-width: 1024px) 28vw, 60vw" className="object-cover" />
            </div>
            <div className="col-span-2 flex flex-col gap-2.5 pt-8">
              <div className="relative aspect-square overflow-hidden rounded-2xl">
                <Image src={stockPhotos.driver} alt="View from the driver's seat" fill sizes="(min-width: 1024px) 18vw, 40vw" className="object-cover" />
              </div>
              <div className="rounded-2xl bg-brand-orange p-4 text-brand-ink">
                <p className="text-2xl font-bold">8–14</p>
                <p className="text-xs font-medium">seats per van, one friendly driver</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="faqs" tone="muted">
        <SectionHeading eyebrow="FAQs" title="Questions, answered" />
        <div className="grid gap-x-8 lg:grid-cols-2">
          {[faqs.slice(0, half), faqs.slice(half)].map((col, c) => (
            <Accordion key={c} type="single" collapsible className="w-full">
              {col.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="py-4 text-left text-base">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-pretty text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ))}
        </div>
      </Section>

      <Section id="contact">
        <SectionHeading eyebrow="Contact" title="Talk to a real person" intro="We reply fast, 7 days a week." />
        <div className="grid gap-3 sm:grid-cols-3">
          <a
            href={whatsappLink("Hi Elsasu, I have a question.")}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl bg-[#25D366] p-4 text-white transition-transform hover:-translate-y-0.5 sm:flex-col sm:items-start sm:p-5"
          >
            <WhatsAppIcon className="size-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">WhatsApp</p>
              <p className="text-sm text-white/85">Fastest reply</p>
            </div>
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5 sm:hidden" />
          </a>
          <ContactCard href={telLink()} icon={Phone} title="Call us" body={formatGhanaPhone(site.phone)} />
          <ContactCard href={`mailto:${site.email}`} icon={Mail} title="Email" body={site.email} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Info icon={Clock} title="Hours">Online bookings 24/7 · office 7am–9pm daily</Info>
          <Info icon={MapPin} title="Based in">{site.address} · we serve all 16 regions</Info>
          <Info icon={Building2} title="Companies">
            <a href={`mailto:${site.email}?subject=Corporate%20account`} className="font-semibold text-foreground underline-offset-4 hover:underline">
              Ask about a corporate account
            </a>
          </Info>
        </div>
        <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl bg-secondary p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium">Just want a price? No need to call: it&apos;s instant online.</p>
          <Button asChild variant="accent" size="lg" className="h-11 rounded-xl px-5">
            <Link href="/book">Get my quote <ArrowRight data-icon="inline-end" /></Link>
          </Button>
        </div>
      </Section>
    </>
  );
}

function ContactCard({ href, icon: Icon, title, body }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <a href={href} className="group flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md sm:flex-col sm:items-start sm:p-5">
      <Icon className="size-7 shrink-0 text-brand-orange" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{body}</p>
      </div>
    </a>
  );
}

function Info({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border bg-card p-4">
      <Icon className="mt-0.5 size-5 shrink-0 text-brand-orange" />
      <div className="text-sm">
        <p className="font-semibold">{title}</p>
        <p className="text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
