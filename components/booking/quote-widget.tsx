"use client";

import { useMemo, useState } from "react";
import { useToday } from "@/lib/use-today";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Briefcase, CalendarDays, CalendarRange, Clock, Minus, PartyPopper,
  Plane, Plus, Route, Sun, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { popularPlaces, tripTypeLabels } from "@/lib/content";
import { LocationInput } from "@/components/booking/location-input";
import type { TripType } from "@/lib/catalog";

export type WidgetVanType = {
  slug: string;
  name: string;
  seats: number;
  byTrip: Partial<Record<TripType, number>>;
};

const trips: { value: TripType; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "airport", icon: Plane },
  { value: "half_day", icon: Clock },
  { value: "full_day", icon: Sun },
  { value: "outstation", icon: Route },
  { value: "event", icon: PartyPopper },
  { value: "multi_day", icon: CalendarRange },
  { value: "corporate_shuttle", icon: Briefcase },
];

/** Same rule the pricing engine uses: 1–8 → 8-seater, 9–14 → 14-seater, 15+ → several vans. */
export function suggestVans(passengers: number, types: WidgetVanType[]) {
  const sorted = [...types].sort((a, b) => a.seats - b.seats);
  const fit = sorted.find((t) => t.seats >= passengers);
  if (fit) return { type: fit, count: 1 };
  const largest = sorted[sorted.length - 1];
  return largest ? { type: largest, count: Math.ceil(passengers / largest.seats) } : null;
}

export function QuoteWidget({ vanTypes, className }: { vanTypes: WidgetVanType[]; className?: string }) {
  const router = useRouter();
  const [trip, setTrip] = useState<TripType>("airport");
  const [pickup, setPickup] = useState("");
  const [date, setDate] = useState("");
  const minDate = useToday();
  const [passengers, setPassengers] = useState(6);


  const suggestion = useMemo(() => suggestVans(passengers, vanTypes), [passengers, vanTypes]);
  const fromPrice = suggestion?.type.byTrip[trip];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ trip, pax: String(passengers) });
    if (pickup.trim()) params.set("from", pickup.trim());
    if (date) params.set("date", date);
    router.push(`/book?${params}`);
  }

  return (
    <form
      data-floating-avoid
      onSubmit={submit}
      className={cn(
        "rounded-3xl border border-white/10 bg-card p-4 text-card-foreground shadow-2xl shadow-black/25 sm:p-6",
        className,
      )}
      aria-label="Get an instant quote"
    >
      <fieldset className="min-w-0">
        <legend className="mb-3 text-sm font-semibold">What kind of trip?</legend>
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
          {trips.map(({ value, icon: Icon }) => {
            const active = trip === value;
            return (
              <label
                key={value}
                className={cn(
                  "flex min-h-11 shrink-0 cursor-pointer snap-start items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors",
                  "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/40",
                )}
              >
                <input
                  type="radio"
                  name="trip"
                  value={value}
                  checked={active}
                  onChange={() => setTrip(value)}
                  className="sr-only"
                />
                <Icon className="size-4" />
                {tripTypeLabels[value]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="qw-pickup">Pick-up</Label>
          <LocationInput
            id="qw-pickup"
            value={pickup}
            onChange={setPickup}
            quickPicks={popularPlaces}
            mapTitle="Where should we pick you up?"
            placeholder={trip === "airport" ? "Kotoka Airport or your address" : "Search, use my location, or pick on map"}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="qw-date">Date</Label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="qw-date"
              type="date"
              min={minDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 rounded-xl pl-11 text-base"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label id="qw-pax-label">Passengers</Label>
          <div
            className="flex h-12 items-center justify-between rounded-xl border border-input bg-background px-1.5"
            role="group"
            aria-labelledby="qw-pax-label"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Fewer passengers"
              onClick={() => setPassengers((p) => Math.max(1, p - 1))}
              disabled={passengers <= 1}
            >
              <Minus />
            </Button>
            <span className="flex items-center gap-2 text-base font-semibold tabular-nums" aria-live="polite">
              <Users className="size-4 text-muted-foreground" />
              {passengers}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="More passengers"
              onClick={() => setPassengers((p) => Math.min(60, p + 1))}
            >
              <Plus />
            </Button>
          </div>
        </div>
      </div>

      {suggestion && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3" aria-live="polite">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Best fit for your group</p>
            <p className="truncate font-semibold">
              {suggestion.count > 1 ? `${suggestion.count} × ` : ""}
              {suggestion.type.name}
            </p>
          </div>
          {fromPrice !== undefined && (
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground">from</p>
              <p className="text-lg font-bold tabular-nums">{formatMoney(fromPrice * suggestion.count)}</p>
            </div>
          )}
        </div>
      )}

      <Button type="submit" variant="accent" size="xl" className="mt-4 w-full">
        See my exact price <ArrowRight data-icon="inline-end" />
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Driver & fuel included · No sign-up needed to get a quote
      </p>
    </form>
  );
}
