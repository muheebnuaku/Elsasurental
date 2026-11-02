"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle, CalendarDays, Check, CheckCircle2, Clock, Loader2, MapPin, Minus, Plus, Send,
  MessageSquareText, Trash2, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { openChat } from "@/components/chat/chat-widget";
import { LocationInput } from "@/components/booking/location-input";
import { Checkout } from "@/components/booking/checkout";
import { createClient } from "@/lib/supabase/client";
import { formatGhanaPhone, normalizeGhanaPhone } from "@/lib/phone";
import { bookingRules } from "@/lib/site";
import { cn } from "@/lib/utils";
import { formatMoney, whatsappLink } from "@/lib/format";
import { popularPlaces, tripTypeHints, tripTypeLabels } from "@/lib/content";
import { tripTypes, type TripRequestInput } from "@/lib/validators/trip";
import { useToday } from "@/lib/use-today";
import type { Quote } from "@/lib/pricing/engine";
import { track } from "@/lib/analytics/client";

type TripType = (typeof tripTypes)[number];

type Props = {
  vanTypes: { slug: string; name: string; seats: number }[];
  destinations: { slug: string; name: string; region: string }[];
  addons: { slug: string; name: string; price: number; unit: string; description: string | null }[];
};

type QuoteResponse = {
  quote: Quote;
  available: boolean;
  distanceKm: number | null;
  destinationName: string | null;
  quoteToken: string;
  expiresInMinutes: number;
};

type ParsedTrip = {
  tripType: TripType | null;
  passengers: number | null;
  pickup: string | null;
  dropoff: string | null;
  stops: string[];
  destinationSlug: string | null;
  date: string | null;
  time: string | null;
  durationHours: number | null;
  days: number | null;
  notes: string | null;
  missing: string[];
};

const needsHours: TripType[] = ["half_day", "full_day", "event", "corporate_shuttle"];

export function BookingForm({ vanTypes, destinations, addons }: Props) {
  const sp = useSearchParams();
  const today = useToday();

  const initialTrip = tripTypes.includes(sp.get("trip") as TripType) ? (sp.get("trip") as TripType) : "airport";
  const destFromUrl = destinations.find((d) => d.slug === (sp.get("dest") ?? sp.get("to")));
  const vanFromUrl = vanTypes.find((v) => v.slug === sp.get("van"));

  const [trip, setTrip] = useState<TripType>(destFromUrl ? "outstation" : initialTrip);
  const [pickup, setPickup] = useState(sp.get("from") ?? "");
  const [dropoff, setDropoff] = useState(destFromUrl?.name ?? sp.get("to") ?? "");
  const [stops, setStops] = useState<string[]>(sp.get("stops")?.split("|").filter(Boolean) ?? []);
  const [date, setDate] = useState(sp.get("date") ?? "");
  const [time, setTime] = useState(sp.get("time") ?? "08:00");
  const [hours, setHours] = useState<number | "">(Number(sp.get("hours")) || "");
  const [days, setDays] = useState(Number(sp.get("days")) || 2);
  const [passengers, setPassengers] = useState(() => {
    const pax = Number(sp.get("pax"));
    return Number.isInteger(pax) && pax > 0 ? Math.min(pax, 60) : vanFromUrl?.seats ?? 6;
  });
  const [chosenAddons, setChosenAddons] = useState<Record<string, number>>({});
  const [name, setName] = useState(sp.get("name") ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Signed in already? Fill in their details so they don't have to.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("full_name, phone, email").eq("id", data.user.id).maybeSingle();
      if (p?.full_name) setName((n) => n || p.full_name!);
      if (p?.phone) setPhone((v) => v || formatGhanaPhone(p.phone!));
      if (p?.email) setEmail((v) => v || p.email!);
    });
  }, []);

  // ── AI "describe your trip" ──
  const [aiText, setAiText] = useState("");
  const [aiState, setAiState] = useState<{ status: "idle" | "loading" | "done" | "error"; filled?: number; missing?: string[]; error?: string }>({ status: "idle" });

  async function fillWithAi() {
    if (aiText.trim().length < 5) return;
    setAiState({ status: "loading" });
    try {
      const res = await fetch("/api/ai/parse-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      const data = (await res.json()) as ParsedTrip & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't read that");
      let filled = 0;
      const set = <T,>(v: T | null | undefined, fn: (v: T) => void) => {
        if (v !== null && v !== undefined && v !== "") {
          fn(v);
          filled++;
        }
      };
      set(data.tripType, setTrip);
      set(data.passengers, setPassengers);
      set(data.pickup, setPickup);
      const dest = destinations.find((d) => d.slug === data.destinationSlug);
      set(dest?.name ?? data.dropoff, setDropoff);
      if (data.stops?.length) set(data.stops, setStops);
      set(data.date, setDate);
      set(data.time, setTime);
      set(data.durationHours, setHours);
      set(data.days, setDays);
      set(data.notes, setNotes);
      setAiState({ status: "done", filled, missing: data.missing });
      track("ai_trip_filled", { fields: filled, missing: data.missing?.length ?? 0 });
    } catch (e) {
      setAiState({ status: "error", error: e instanceof Error ? e.message : "Something went wrong" });
    }
  }

  // ── Live quote ──
  const request: TripRequestInput | null = useMemo(() => {
    if (!pickup.trim() || pickup.trim().length < 2 || !date || !time) return null;
    const dest = destinations.find((d) => d.name.toLowerCase() === dropoff.trim().toLowerCase());
    return {
      tripType: trip,
      passengers,
      pickup: pickup.trim(),
      dropoff: dropoff.trim() || undefined,
      stops: stops.map((s) => s.trim()).filter((s) => s.length >= 2),
      destinationSlug: trip === "outstation" ? dest?.slug : undefined,
      date,
      time,
      durationHours: needsHours.includes(trip) && hours ? Number(hours) : undefined,
      days: trip === "multi_day" ? days : undefined,
      vehicleTypeSlug: vanFromUrl && passengers <= vanFromUrl.seats ? vanFromUrl.slug : undefined,
      addons: Object.entries(chosenAddons).filter(([, q]) => q > 0).map(([slug, qty]) => ({ slug, qty })),
    };
  }, [trip, passengers, pickup, dropoff, stops, date, time, hours, days, chosenAddons, destinations, vanFromUrl]);

  const [quote, setQuote] = useState<{ status: "idle" | "loading" | "ok" | "error"; data?: QuoteResponse; error?: string }>({ status: "idle" });
  const [quoteNonce, setQuoteNonce] = useState(0);
  const reqKey = request ? JSON.stringify(request) + "#" + quoteNonce : "";
  const lastKey = useRef("");

  useEffect(() => {
    if (!reqKey || reqKey === lastKey.current) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      lastKey.current = reqKey;
      setQuote((q) => ({ ...q, status: "loading" }));
      try {
        const res = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: reqKey.slice(0, reqKey.lastIndexOf("#")), signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) setQuote({ status: "error", error: data.error ?? "Couldn't price that trip" });
        else {
          setQuote({ status: "ok", data });
          track("quote_shown", { trip_type: data.quote.tripType, passengers: data.quote.passengers, vans: data.quote.vans.length, total: data.quote.total, available: data.available });
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") setQuote({ status: "error", error: "Network problem. Try again." });
      }
    }, 600);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [reqKey]);

  const q = quote.data?.quote;
  const phoneOk = Boolean(normalizeGhanaPhone(phone));
  const ready = quote.status === "ok" && q && quote.data?.available && name.trim().length >= 2 && phoneOk;

  const waMessage = q
    ? [
        `Hi Elsasu, I'd like to book.`,
        `Name: ${name}`,
        `Phone: ${phone}`,
        `Trip: ${tripTypeLabels[trip]}`,
        `From: ${pickup}${dropoff ? ` → ${dropoff}` : ""}${stops.length ? ` (stops: ${stops.join(", ")})` : ""}`,
        `When: ${date} at ${time}`,
        `Passengers: ${passengers} (${q.vans.map((v) => v.name).join(" + ")})`,
        `Quoted total: GHS ${q.total} · deposit GHS ${q.deposit}`,
        notes ? `Notes: ${notes}` : "",
      ].filter(Boolean).join("\n")
    : "";

  return (
    <div data-floating-avoid className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-5">
      <div className="min-w-0 space-y-3">
        {/* AI assist */}
        <section className="relative overflow-hidden rounded-2xl border border-brand-orange/30 bg-gradient-to-br from-brand-orange/10 via-card to-card p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-brand-orange text-brand-ink"><MessageSquareText className="size-4" /></span>
            <h2 className="font-semibold">Describe your trip, we fill the form</h2>
          </div>
          <Textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="e.g. 12 of us from East Legon to Cape Coast this Saturday 6am, coming back the same day"
            className="mt-3 min-h-20 rounded-2xl bg-background text-base"
            maxLength={1000}
            aria-label="Describe your trip"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="button" variant="accent" size="xl" className="h-11" onClick={fillWithAi} disabled={aiState.status === "loading" || aiText.trim().length < 5}>
              {aiState.status === "loading" && <Loader2 className="animate-spin" />} Fill the form for me
            </Button>
            <button type="button" onClick={() => openChat()} className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:ml-auto">
              Prefer to chat? Ask our assistant
            </button>
          </div>
          {aiState.status === "done" && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
              <CheckCircle2 className="size-4 text-success" /> Filled {aiState.filled} details. Please check them below.
              {aiState.missing?.map((m) => (
                <span key={m} className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium">Need: {m}</span>
              ))}
            </p>
          )}
          {aiState.status === "error" && (
            <p className="mt-3 flex items-center gap-2 text-sm text-destructive"><AlertCircle className="size-4" /> {aiState.error}</p>
          )}
        </section>

        {/* Trip type */}
        <Card title="1. Trip type">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {tripTypes.map((t) => (
              <label
                key={t}
                className={cn(
                  "flex cursor-pointer flex-col rounded-xl border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  trip === t ? "border-brand-ink bg-brand-ink text-white dark:border-brand-orange dark:bg-brand-orange/10 dark:text-foreground" : "hover:border-foreground/30",
                )}
              >
                <input type="radio" name="trip" className="sr-only" checked={trip === t} onChange={() => setTrip(t)} />
                <span className="text-sm font-semibold">{tripTypeLabels[t]}</span>
                <span className={cn("line-clamp-1 text-xs", trip === t ? "text-white/70 dark:text-muted-foreground" : "text-muted-foreground")}>{tripTypeHints[t]}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* Route */}
        <Card title="2. Route">
          <div className="space-y-1.5">
            <Label htmlFor="bf-from">Pick-up</Label>
            <LocationInput id="bf-from" value={pickup} onChange={setPickup} quickPicks={popularPlaces} mapTitle="Where should we pick you up?" placeholder={trip === "airport" ? "Kotoka Airport T3 or your address" : "Search, use my location, or pick on map"} />
          </div>
          {stops.map((s, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor={`bf-stop-${i}`}>Stop {i + 1}</Label>
                <LocationInput id={`bf-stop-${i}`} value={s} onChange={(v) => setStops(stops.map((x, j) => (j === i ? v : x)))} quickPicks={popularPlaces} mapTitle={`Stop ${i + 1}`} />
              </div>
              <Button type="button" variant="ghost" size="icon-lg" className="size-12" aria-label={`Remove stop ${i + 1}`} onClick={() => setStops(stops.filter((_, j) => j !== i))}><Trash2 /></Button>
            </div>
          ))}
          {stops.length < 8 && (
            <button type="button" onClick={() => setStops([...stops, ""])} className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <Plus className="size-4" /> Add a stop
            </button>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="bf-to">{trip === "outstation" ? "Destination" : "Drop-off (optional)"}</Label>
            <LocationInput id="bf-to" value={dropoff} onChange={setDropoff} quickPicks={trip === "outstation" ? destinations.map((d) => d.name) : popularPlaces} mapTitle="Where are you going?" placeholder={trip === "outstation" ? "e.g. Cape Coast" : "Where to?"} />
          </div>
          {trip === "outstation" && (
            <div className="flex flex-wrap gap-2">
              {destinations.slice(0, 6).map((d) => (
                <button key={d.slug} type="button" onClick={() => setDropoff(d.name)} className={cn("rounded-full border px-3 py-1.5 text-sm", dropoff === d.name ? "border-brand-orange bg-brand-orange/10 font-semibold" : "hover:border-foreground/30")}>
                  {d.name}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* When + who */}
        <Card title="3. When & who">
          <div className="grid gap-4 min-[420px]:grid-cols-2">
            <IconField id="bf-date" label="Date" icon={CalendarDays}>
              <Input id="bf-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-xl pl-11 text-base" />
            </IconField>
            <IconField id="bf-time" label="Pick-up time" icon={Clock}>
              <Input id="bf-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12 rounded-xl pl-11 text-base" />
            </IconField>
            {needsHours.includes(trip) && (
              <IconField id="bf-hours" label="How many hours? (optional)" icon={Clock}>
                <Input id="bf-hours" type="number" inputMode="decimal" min={1} max={24} value={hours} onChange={(e) => setHours(e.target.value ? Number(e.target.value) : "")} className="h-12 rounded-xl pl-11 text-base" />
              </IconField>
            )}
            {trip === "multi_day" && (
              <Stepper label="Days" value={days} min={1} max={30} onChange={setDays} />
            )}
            <Stepper label="Passengers" value={passengers} min={1} max={60} onChange={setPassengers} icon={Users} />
          </div>
        </Card>

        {/* Add-ons */}
        {addons.filter((a) => a.slug !== "extra-stop").length > 0 && (
          <Card title="4. Extras (optional)">
            <div className="grid gap-2 sm:grid-cols-3">
              {addons.filter((a) => a.slug !== "extra-stop").map((a) => {
                const on = (chosenAddons[a.slug] ?? 0) > 0;
                return (
                  <label key={a.slug} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50", on && "border-brand-orange bg-brand-orange/5")}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => setChosenAddons({ ...chosenAddons, [a.slug]: on ? 0 : 1 })} />
                    <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border", on && "border-brand-orange bg-brand-orange text-brand-ink")}>{on && <Check className="size-3.5" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2 font-medium">{a.name} <span className="tabular-nums">{formatMoney(a.price)}</span></span>
                      {a.description && <span className="text-xs text-muted-foreground">{a.description}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </Card>
        )}

        {/* Contact */}
        <Card title="5. Your details">
          <div className="grid gap-4 min-[420px]:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bf-name">Full name</Label>
              <Input id="bf-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl text-base" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bf-phone">Phone (MoMo number)</Label>
              <Input id="bf-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="024 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={phone.length > 5 && !phoneOk} className="h-12 rounded-xl text-base" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bf-email">Email for your receipt (optional)</Label>
            <Input id="bf-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl text-base" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bf-notes">Notes for the driver (optional)</Label>
            <Textarea id="bf-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Flight number, luggage, landmarks…" className="min-h-20 rounded-xl text-base" />
          </div>
        </Card>
      </div>

      {/* Live quote */}
      <aside className="lg:sticky lg:top-24" aria-live="polite">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="bg-brand-ink p-4 text-white sm:p-5">
            <p className="text-sm text-white/60">Your price</p>
            {quote.status === "loading" && !q ? (
              <Skeleton className="mt-2 h-10 w-40 bg-white/10" />
            ) : q && quote.status !== "error" ? (
              <div className={cn("transition-opacity", quote.status === "loading" && "opacity-60")}>
                <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">{formatMoney(q.total)}</p>
                <p className="mt-1 text-sm text-white/70">
                  Pay <span className="font-semibold text-brand-orange-text">{formatMoney(q.deposit)}</span> deposit now · {q.vans.map((v) => v.name).join(" + ")}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-lg text-white/80">Add pick-up and date to see your exact price</p>
            )}
          </div>

          {quote.status === "error" && <p className="flex gap-2 p-5 text-sm text-destructive"><AlertCircle className="size-4 shrink-0" /> {quote.error}</p>}

          {q && quote.status !== "error" && (
            <div className="space-y-3 p-4 sm:p-5">
              <ul className="space-y-1.5 text-sm">
                {q.lines.map((l, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{l.label}</span>
                    <span className={cn("shrink-0 tabular-nums", l.amount < 0 && "text-success")}>{formatMoney(l.amount)}</span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-1.5 border-t pt-3 text-sm">
                <li className="flex items-center gap-2"><Check className="size-4 text-success" /> Professional driver & fuel</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-success" /> {q.included.hours} hours{q.included.km ? ` · ${q.included.km} km` : ""} included</li>
                {quote.data?.distanceKm != null && <li className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" /> Route ≈ {quote.data.distanceKm} km</li>}
                {quote.data?.available ? (
                  <li className="flex items-center gap-2 font-medium text-success"><CheckCircle2 className="size-4" /> Vans available</li>
                ) : (
                  <li className="flex items-center gap-2 font-medium text-destructive"><AlertCircle className="size-4" /> Fully booked then. Try another time.</li>
                )}
              </ul>
              {q.notes.filter((n) => !n.startsWith("We may not")).map((n) => (
                <p key={n} className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">{n}</p>
              ))}

              {quote.data && quote.data.available && (
                <Checkout
                  quoteToken={quote.data.quoteToken}
                  total={q.total}
                  deposit={q.deposit}
                  depositPct={bookingRules.depositPct}
                  name={name}
                  phone={phone}
                  email={email}
                  notes={notes}
                  onExpired={() => {
                    lastKey.current = "";
                    setQuoteNonce((n) => n + 1);
                  }}
                />
              )}
              {ready && (
                <a href={whatsappLink(waMessage)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <Send className="size-3.5" /> Prefer WhatsApp? Send this booking to our team
                </a>
              )}
            </div>
          )}
        </div>
        <a href={whatsappLink("Hi Elsasu, I need help with a booking.")} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <WhatsAppIcon className="size-4" /> Questions? Chat with a person
        </a>
      </aside>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  );
}

function IconField({ id, label, icon: Icon, children, className }: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-5 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange, icon: Icon }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; icon?: React.ComponentType<{ className?: string }> }) {
  const id = `st-${label.toLowerCase()}`;
  return (
    <div className="space-y-1.5">
      <Label id={id}>{label}</Label>
      <div className="flex h-12 items-center justify-between rounded-xl border border-input px-1.5" role="group" aria-labelledby={id}>
        <Button type="button" variant="ghost" size="icon-lg" aria-label={`Fewer ${label.toLowerCase()}`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}><Minus /></Button>
        <span className="flex items-center gap-2 font-semibold tabular-nums">{Icon && <Icon className="size-4 text-muted-foreground" />} {value}</span>
        <Button type="button" variant="ghost" size="icon-lg" aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}><Plus /></Button>
      </div>
    </div>
  );
}
