import Link from "next/link";
import { Briefcase, CalendarCheck, Check, Users } from "lucide-react";
import { VanPhoto } from "@/components/fleet/van-photo";
import { formatMoney } from "@/lib/format";
import type { FleetType } from "@/lib/catalog";

export function fleetFeatures(type: FleetType, max = 5) {
  return [...new Set(type.vehicles.flatMap((v) => v.features))].slice(0, max);
}

/** Whole card opens the van's page; the round button books it directly. */
export function FleetCard({ type, priority = false }: { type: FleetType; priority?: boolean }) {
  const photos = type.vehicles.flatMap((v) => v.photos);
  const features = fleetFeatures(type, 4);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative overflow-hidden">
        <VanPhoto
          photos={photos}
          seats={type.seats}
          category={type.category}
          alt={type.name}
          priority={priority}
          sizes="(min-width: 768px) 45vw, 100vw"
          className="aspect-[16/9] transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute top-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur">
          {type.vehicles.length} in fleet
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight">
              {/* Stretched link: makes the whole card clickable without nesting links. */}
              <Link href={`/fleet/${type.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                {type.name}
              </Link>
            </h3>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Users className="size-4" /> {type.seats} seats</span>
              <span className="inline-flex items-center gap-1.5"><Briefcase className="size-4" /> {type.luggage_capacity} bags</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            {type.fromPrice !== null && (
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">from</p>
                <p className="text-lg leading-tight font-bold tabular-nums">{formatMoney(type.fromPrice)}</p>
              </div>
            )}
            <Link
              href={`/book?van=${type.slug}`}
              aria-label={`Book the ${type.name}`}
              title="Book this van"
              className="relative z-10 grid size-11 place-items-center rounded-full bg-brand-orange text-brand-ink shadow-md transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-95"
            >
              <CalendarCheck className="size-5" />
            </Link>
          </div>
        </div>

        {features.length > 0 && (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-success" /> {f}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
