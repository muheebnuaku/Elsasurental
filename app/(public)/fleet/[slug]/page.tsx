import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Briefcase, CalendarCheck, Check, ChevronRight, Clock, Gauge, Moon, Plus, Snowflake, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/site/section";
import { VanGallery, type GalleryItem } from "@/components/fleet/van-gallery";
import { AskButton } from "@/components/chat/ask-button";
import { fleetFeatures } from "@/components/fleet/fleet-card";
import { getAddons, getFleet, type TripType } from "@/lib/catalog";
import { tripTypeHints, tripTypeLabels } from "@/lib/content";
import { formatMoney } from "@/lib/format";
import { stockVanGallery } from "@/lib/stock-photos";

const tripOrder: TripType[] = ["airport", "half_day", "full_day", "multi_day", "outstation", "event", "corporate_shuttle"];

export async function generateStaticParams() {
  return (await getFleet()).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/fleet/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const type = (await getFleet()).find((t) => t.slug === slug);
  if (!type) return {};
  return {
    title: `${type.name} hire with driver`,
    description: `${type.name}: up to ${type.seats} passengers and ${type.luggage_capacity} bags, with a professional driver. ${type.description ?? ""}`.trim(),
  };
}

export default function VanPage({ params }: PageProps<"/fleet/[slug]">) {
  return (
    <Suspense fallback={<VanSkeleton />}>
      <VanDetails params={params} />
    </Suspense>
  );
}

function VanSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.35fr_1fr]">
      <Skeleton className="aspect-[16/10] rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
    </div>
  );
}

async function VanDetails({ params }: { params: PageProps<"/fleet/[slug]">["params"] }) {
  const { slug } = await params;
  const [fleet, addons] = await Promise.all([getFleet(), getAddons()]);
  const type = fleet.find((t) => t.slug === slug);
  if (!type) notFound();

  // Admin-uploaded photos and videos of these vans first; stock photos until there are any.
  const uploaded = type.vehicles.flatMap((v) => v.photos).filter(Boolean);
  const media: GalleryItem[] = [
    ...(uploaded.length ? uploaded : stockVanGallery(type.seats, type.category)).map((src) => ({ type: "image" as const, src })),
    ...type.vehicles.flatMap((v) => v.videos).filter(Boolean).map((src) => ({ type: "video" as const, src })),
  ];
  const rules = tripOrder
    .map((t) => type.pricing.find((p) => p.trip_type === t))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  const features = fleetFeatures(type, 10);
  const others = fleet.filter((t) => t.id !== type.id);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/fleet" className="hover:text-foreground">Fleet</Link>
          <ChevronRight className="size-3.5" />
          <span className="font-medium text-foreground">{type.name}</span>
        </nav>
      </div>

      <Section className="pt-4 sm:pt-5 lg:pt-6">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:gap-8">
          <VanGallery items={media} title={type.name} />

          <div className="lg:sticky lg:top-24 lg:self-start">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{type.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <Chip icon={Users}>{type.seats} passengers</Chip>
              <Chip icon={Briefcase}>{type.luggage_capacity} large bags</Chip>
              <Chip icon={Snowflake}>Air-conditioned</Chip>
            </div>
            {type.description && <p className="mt-4 text-pretty text-muted-foreground">{type.description}</p>}

            <div className="mt-5 flex items-end justify-between gap-4 rounded-2xl bg-brand-ink p-4 text-white">
              <div>
                <p className="text-xs text-white/60">Prices from</p>
                <p className="text-3xl font-bold tracking-tight tabular-nums">{type.fromPrice !== null ? formatMoney(type.fromPrice) : "—"}</p>
                <p className="text-xs text-white/60">driver & fuel included · no self-drive</p>
              </div>
              <p className="text-right text-xs text-white/60">{type.vehicles.length} in our fleet</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button asChild variant="accent" size="xl" className="h-11 gap-1.5 px-3 text-[15px] [&_svg]:size-4">
                <Link href={`/book?van=${type.slug}`}><CalendarCheck /> Book this {type.category === "suv" ? "SUV" : "van"}</Link>
              </Button>
              <AskButton message={`Tell me about the ${type.name}. Is it right for my group?`} className="h-11 gap-1.5 px-3 text-[15px] [&_svg]:size-4">
                Ask about it
              </AskButton>
            </div>

            {features.length > 0 && (
              <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="size-4 shrink-0 text-success" /> {f}</li>
                ))}
              </ul>
            )}

            {type.vehicles.length > 0 && (
              <div className="mt-5 border-t pt-4">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">In this class</p>
                <ul className="mt-2 divide-y text-sm">
                  {type.vehicles.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="font-medium">{v.name}</span>
                      <span className="text-muted-foreground">{[v.year, v.colour].filter(Boolean).join(" · ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Section>

      {rules.length > 0 && (
        <Section tone="muted">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">What&apos;s included, by trip</h2>
          <p className="mt-1 text-sm text-muted-foreground">Every trip includes a professional driver and fuel for the included distance.</p>
          <ul className="mt-5 grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 lg:grid-cols-4">
            {rules.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/book?van=${type.slug}&trip=${r.trip_type}`}
                  className="group flex h-full flex-col rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-brand-orange/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{tripTypeLabels[r.trip_type]}</p>
                      <p className="text-xs text-muted-foreground">{tripTypeHints[r.trip_type]}</p>
                    </div>
                    <p className="shrink-0 text-lg font-bold tabular-nums">
                      {formatMoney(r.base_price)}
                      {r.trip_type === "multi_day" && <span className="text-xs font-normal text-muted-foreground">/day</span>}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Gauge className="size-3.5" /> {r.included_km} km</span>
                    <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {r.included_hours} h</span>
                    {r.night_surcharge_pct > 0 && <span className="inline-flex items-center gap-1"><Moon className="size-3.5" /> +{r.night_surcharge_pct}% at night</span>}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Extra: {formatMoney(r.extra_km_rate)}/km · {formatMoney(r.extra_hour_rate)}/h
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {addons.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold">Add-ons</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {addons.map((a) => (
                  <li key={a.id} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm">
                    <Plus className="size-3.5 text-brand-orange" /> {a.name}
                    <span className="font-semibold tabular-nums">{formatMoney(a.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}

      {others.length > 0 && (
        <Section>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 sm:p-5">
            <p className="font-medium">
              Need {others[0]!.seats > type.seats ? "more" : "fewer"} seats? See the {others[0]!.name}.
            </p>
            <Button asChild variant="outline" size="lg" className="h-10 rounded-xl">
              <Link href={`/fleet/${others[0]!.slug}`}>View {others[0]!.name} <ArrowRight data-icon="inline-end" /></Link>
            </Button>
          </div>
        </Section>
      )}
    </>
  );
}

function Chip({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-medium">
      <Icon className="size-4 text-brand-orange" /> {children}
    </span>
  );
}
