import type { Metadata } from "next";
import { PageHero, Section } from "@/components/site/section";
import { PhotoCard } from "@/components/site/photo-card";
import { getFleet, fromPricesByTrip } from "@/lib/catalog";
import { services } from "@/lib/content";
import { formatMoney } from "@/lib/format";
import { servicePhotos } from "@/lib/stock-photos";

export const metadata: Metadata = {
  title: "Services — airport, weddings, funerals, church trips, tours & corporate",
  description:
    "Group transport for every occasion in Ghana: airport transfers, weddings, funerals, church outings, tours and staff shuttles.",
};

export default async function ServicesPage() {
  const fromPrices = fromPricesByTrip(await getFleet());

  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Group transport for every occasion"
        intro="One booking, the right van and a friendly professional driver."
      />
      <Section>
        <div className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const from = fromPrices[s.trip];
            return (
              <PhotoCard
                key={s.slug}
                id={s.slug}
                href={`/book?trip=${s.trip}`}
                image={servicePhotos[s.slug]}
                title={s.title}
                description={s.blurb}
                badge={from !== undefined ? `from ${formatMoney(from)}` : undefined}
                className="min-h-48 sm:min-h-52"
                sizes="(min-width: 1024px) 25vw, (min-width: 480px) 50vw, 100vw"
              />
            );
          })}
        </div>
      </Section>
    </>
  );
}
