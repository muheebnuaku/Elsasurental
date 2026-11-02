import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Clock, CreditCard, Headphones, MapPinned, ShieldCheck, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeHero } from "@/components/site/home-hero";
import { Packages } from "@/components/site/packages";
import { FleetCard } from "@/components/fleet/fleet-card";
import { Section, SectionHeading } from "@/components/site/section";
import { PhotoCard } from "@/components/site/photo-card";
import { AutoCarousel } from "@/components/site/auto-carousel";
import { servicePhotos } from "@/lib/stock-photos";
import { getDestinations, getFleet, getPublishedReviews } from "@/lib/catalog";
import { howItWorks, services, whyElsasu } from "@/lib/content";
import { formatHours, formatMoney } from "@/lib/format";
import { site } from "@/lib/site";
import { getBusiness, type Business } from "@/lib/business";

export default async function HomePage() {
  const [fleet, destinations, reviews, business] = await Promise.all([
    getFleet(),
    getDestinations(),
    getPublishedReviews(),
    getBusiness(),
  ]);

  return (
    <>
      <LocalBusinessJsonLd business={business} />
      <HomeHero fleet={fleet} />
      <ValueStrip />
      <Packages fleet={fleet} />

      <Section id="fleet" tone="muted">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Our fleet"
            title="Room for the whole group"
            intro="Air-conditioned minivans and SUVs, always with a professional driver. Pick the vehicle, we handle the rest."
            className="mb-0 sm:mb-0"
          />
          <Link href="/fleet" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
            Compare vehicles <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {fleet.map((t, i) => (
            <FleetCard key={t.id} type={t} priority={i === 0} />
          ))}
        </div>
      </Section>

      <Section id="services">
        <SectionHeading
          eyebrow="Services"
          title="Whatever the occasion, we'll get everyone there"
          align="center"
        />
        <AutoCarousel
          label="Services"
          intervalMs={3000}
          itemClassName="basis-[calc((100%-0.625rem)/2)] sm:basis-[calc((100%-1.25rem)/3)] lg:basis-[calc((100%-1.875rem)/4)]"
        >
          {services.map((s) => (
            <PhotoCard
              key={s.slug}
              href={`/services#${s.slug}`}
              image={servicePhotos[s.slug]}
              title={s.title}
              className="min-h-44 sm:min-h-52"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            />
          ))}
        </AutoCarousel>
      </Section>

      <Section id="how-it-works">
        <SectionHeading eyebrow="How it works" title="Booked in under two minutes" align="center" />
        <AutoCarousel label="How it works" intervalMs={4000} itemClassName="basis-[84%] sm:basis-[55%]" desktopGrid="lg:grid-cols-3 lg:gap-3">
          {howItWorks.map((step, i) => (
            <div key={step.title} className="flex h-full gap-4 rounded-2xl border bg-card p-4 sm:p-5">
              <span className="font-display text-4xl leading-none text-brand-orange-text italic tabular-nums">0{i + 1}</span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">{step.body}</p>
              </div>
            </div>
          ))}
        </AutoCarousel>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="accent" size="xl" className="w-full sm:w-auto">
            <Link href="/book">
              Start my booking <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </Section>

      {destinations.length > 0 && (
        <Section id="destinations" tone="muted">
          <SectionHeading
            eyebrow="Popular trips from Accra"
            title="Fixed prices to Ghana's favourite places"
            intro="Same-day return with your driver. Prices from our most affordable vehicle."
          />
          <AutoCarousel label="Destinations" intervalMs={3200} itemClassName="basis-[calc((100%-0.625rem)/2)] sm:basis-[calc((100%-1.25rem)/3)]" desktopGrid="lg:grid-cols-5 lg:gap-2.5">
            {destinations.map((d) => (
              <PhotoCard
                key={d.id}
                href={`/book?trip=outstation&to=${d.slug}`}
                image={d.image_url}
                eyebrow={d.region}
                title={d.name}
                badge={Object.keys(d.prices).length ? `from ${formatMoney(Math.min(...Object.values(d.prices)))}` : undefined}
                className="min-h-48 sm:min-h-56"
                sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                footer={
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" /> {formatHours(d.est_hours)} each way
                  </span>
                }
              />
            ))}
          </AutoCarousel>
          <p className="mt-4 text-sm text-muted-foreground">
            Going somewhere else? <Link href="/book?trip=outstation" className="font-semibold text-foreground underline-offset-4 hover:underline">Get an instant quote for any route.</Link>
          </p>
        </Section>
      )}

      <WhyElsasu />

      {reviews.length > 0 && (
        <Section id="reviews">
          <SectionHeading eyebrow="Reviews" title="What our passengers say" align="center" />
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="rounded-2xl border bg-card p-5">
                <div className="flex gap-0.5 text-brand-orange" aria-label={`${r.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={i < r.rating ? "size-4 fill-current" : "size-4 opacity-30"} />
                  ))}
                </div>
                {r.comment && <blockquote className="mt-4 text-pretty">“{r.comment}”</blockquote>}
              </figure>
            ))}
          </div>
        </Section>
      )}

    </>
  );
}

function ValueStrip() {
  const items = [
    { icon: MapPinned, title: "Any route", body: "Instant quotes" },
    { icon: CreditCard, title: "Pay securely", body: "Paystack · MoMo" },
    { icon: ShieldCheck, title: "Fair policy", body: "Free changes" },
    { icon: Headphones, title: "24/7 help", body: "WhatsApp & web" },
  ];
  return (
    <div className="border-b bg-background">
      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {items.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-center gap-3 bg-background px-4 py-3.5 sm:justify-center sm:px-6">
            <Icon className="size-5 shrink-0 text-brand-orange" />
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhyElsasu() {
  return (
    <Section id="why">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.5fr] lg:items-center lg:gap-10">
        <div>
          <SectionHeading
            eyebrow="Why Elsasu"
            title="One van instead of four cars"
            intro="Car hire is usually built for four. We're built for groups: everyone travels together, for less per head."
            className="mb-0 sm:mb-0"
          />
        </div>
        <AutoCarousel label="Why Elsasu" intervalMs={3500} itemClassName="basis-[78%] sm:basis-[45%]" desktopGrid="lg:grid-cols-2 lg:gap-2.5">
          {whyElsasu.map((w) => (
            <div key={w.title} className="h-full rounded-2xl border bg-card p-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <BadgeCheck className="size-5 shrink-0 text-brand-orange" /> {w.title}
              </h3>
              <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{w.body}</p>
            </div>
          ))}
        </AutoCarousel>
      </div>
    </Section>
  );
}

function LocalBusinessJsonLd({ business }: { business: Business }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${site.url}/#business`,
    name: site.name,
    description: site.description,
    url: site.url,
    telephone: business.phone,
    email: business.email,
    address: { "@type": "PostalAddress", addressLocality: "Accra", addressCountry: "GH" },
    areaServed: { "@type": "Country", name: "Ghana" },
    priceRange: "GHS",
    openingHours: "Mo-Su 00:00-23:59",
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
