import { Section, SectionHeading } from "@/components/site/section";
import { PhotoCard } from "@/components/site/photo-card";
import { packagePhotos } from "@/lib/stock-photos";
import { tripTypeLabels } from "@/lib/content";
import { formatMoney } from "@/lib/format";
import type { FleetType, TripType } from "@/lib/catalog";

const order: { trip: TripType }[] = [
  { trip: "airport" },
  { trip: "half_day" },
  { trip: "full_day" },
  { trip: "outstation" },
  { trip: "event" },
  { trip: "multi_day" },
];

// TODO(confirm): extras like bottled water / Wi-Fi only if Elsasu actually provides them.
const includes = [
  "Professional, uniformed driver",
  "Fuel for the included distance",
  "Air-conditioned, cleaned before every trip",
  "Phone charging on board",
  "Live tracking link for your group",
  "Help on WhatsApp, day and night",
];

/** Packages with "from" prices and what's included — all numbers straight from the pricing table. */
export function Packages({ fleet }: { fleet: FleetType[] }) {
  const smallest = [...fleet].sort((a, b) => a.seats - b.seats)[0];
  return (
    <Section id="packages">
      <SectionHeading
        eyebrow="Packages"
        title="Clear prices, before you even ask"
        intro={`Prices from our ${smallest?.name ?? "8-seater"}. Bigger groups, extra stops or a different route? Your exact price updates instantly when you book.`}
      />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {order.map(({ trip }) => {
          const rules = fleet.flatMap((t) => t.pricing.filter((p) => p.trip_type === trip));
          const rule = smallest?.pricing.find((p) => p.trip_type === trip);
          if (!rules.length || !rule) return null;
          const from = Math.min(...rules.map((r) => r.base_price));
          return (
            <PhotoCard
              key={trip}
              href={`/book?trip=${trip}`}
              image={packagePhotos[trip]}
              title={tripTypeLabels[trip]}
              badge={`${formatMoney(from)}${trip === "multi_day" ? "/day" : ""}`}
              className="min-h-40 sm:min-h-44"
              sizes="(min-width: 1280px) 16vw, (min-width: 640px) 33vw, 50vw"
              footer={trip === "outstation" ? "Fixed-price trips" : `${rule.included_hours}h · ${rule.included_km} km included`}
            />
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-secondary/70 p-4 sm:p-5">
        <h3 className="font-semibold">Every trip includes</h3>
        <ol className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {includes.map((item, i) => (
            <li key={item} className="flex items-center gap-3">
              <span className="font-display text-2xl leading-none text-brand-orange-text italic tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm font-medium">{item}</span>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
