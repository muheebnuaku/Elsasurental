import Image from "next/image";
import { BadgeCheck, Navigation, Users, Wallet } from "lucide-react";
import { QuoteWidget, type WidgetVanType } from "@/components/booking/quote-widget";
import { HeroJourney } from "@/components/site/hero-journey";
import type { FleetType } from "@/lib/catalog";
import { stockPhotos } from "@/lib/stock-photos";

const moments = [
  "Picking up Auntie from Kotoka",
  "The whole choir to Kumasi",
  "Bridal party to the reception",
  "Youth camp at Akosombo",
  "Homegoing to the village",
  "Team offsite in Aburi",
  "Diaspora cousins to Cape Coast",
  "Sunday service, everyone together",
];

export function HomeHero({ fleet }: { fleet: FleetType[] }) {
  // The quick quote suggests a van by group size; SUVs are booked by choosing them (fleet page / booking form).
  const vanTypes: WidgetVanType[] = fleet.filter((t) => t.category === "van").map((t) => ({
    slug: t.slug,
    name: t.name,
    seats: t.seats,
    byTrip: Object.fromEntries(t.pricing.map((p) => [p.trip_type, p.base_price])),
  }));

  return (
    <section className="relative isolate overflow-hidden bg-brand-ink text-white">
      {/* photo of the road ahead, softened, with warm light on top */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <Image src={stockPhotos.hero} alt="" fill priority sizes="100vw" className="object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-ink via-brand-ink/85 to-brand-ink/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-ink via-transparent to-brand-ink/40" />
        <div className="absolute -top-40 right-[-10%] size-[42rem] rounded-full bg-brand-orange/25 blur-[120px]" />
        <div className="absolute bottom-[-30%] left-[-15%] size-[36rem] rounded-full bg-[#c2410c]/25 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(transparent,rgba(0,0,0,0.55))]" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 px-4 pt-8 pb-8 sm:px-6 sm:pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pt-14 lg:pb-14">
        <div className="min-w-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-[2.5rem] leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl lg:text-[4.25rem]">
            Bring everyone along.{" "}
            <span className="font-display font-normal tracking-normal text-brand-orange italic">We&apos;ll drive.</span>
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-white/75 sm:text-lg">
            Comfortable minivans and SUVs with friendly, professional drivers, anywhere in Ghana.
            See your price in seconds and pay with MoMo.
          </p>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
            {[
              { icon: Users, text: "Up to 14 per van" },
              { icon: Wallet, text: "MoMo & card" },
              { icon: Navigation, text: "Live tracking" },
              { icon: BadgeCheck, text: "Vetted drivers" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                <Icon className="size-4 shrink-0 text-brand-orange" /> {text}
              </li>
            ))}
          </ul>

          <HeroJourney className="mt-6 -mx-4 max-w-xl sm:mt-8 sm:-mx-2 lg:mx-0" />
        </div>

        <div className="min-w-0 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <QuoteWidget vanTypes={vanTypes} />
        </div>
      </div>

      <Moments />
    </section>
  );
}

/** Gently scrolling strip of real reasons people travel together. */
function Moments() {
  return (
    <div className="relative border-t border-white/10 bg-black/10 py-4">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-brand-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-brand-ink to-transparent" />
      <div className="overflow-hidden" aria-label="Trips we make every week">
        <ul className="flex w-max animate-marquee gap-8 pr-8 motion-reduce:animate-none">
          {[...moments, ...moments].map((m, i) => (
            <li
              key={i}
              aria-hidden={i >= moments.length}
              className="flex items-center gap-3 font-display text-lg whitespace-nowrap text-white/70 italic sm:text-xl"
            >
              <span className="size-1.5 rounded-full bg-brand-orange" /> {m}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
