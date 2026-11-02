"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, fieldCls } from "@/components/admin/ui";
import { LocationInput } from "@/components/booking/location-input";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { createPhoneBooking, type AdminResult } from "@/lib/actions/admin-bookings";
import { popularPlaces, tripTypeLabels } from "@/lib/content";
import { formatMoney } from "@/lib/format";
import { normalizeGhanaPhone } from "@/lib/phone";
import { tripTypes } from "@/lib/validators/trip";
import type { Quote } from "@/lib/pricing/engine";

type TripType = (typeof tripTypes)[number];
const needsHours: TripType[] = ["half_day", "full_day", "event", "corporate_shuttle"];

export function PhoneBookingForm({ destinations }: { destinations: { slug: string; name: string }[] }) {
  const [trip, setTrip] = useState<TripType>("airport");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [pax, setPax] = useState(6);
  const [hours, setHours] = useState("");
  const [days, setDays] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [payMode, setPayMode] = useState<"link" | "cash" | "unpaid">("link");
  const [cash, setCash] = useState("");
  const [quote, setQuote] = useState<{ q?: Quote; token?: string; available?: boolean; error?: string; loading?: boolean }>({});
  const [result, setResult] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();

  const request = useMemo(() => {
    if (pickup.trim().length < 2 || !date) return null;
    const dest = destinations.find((d) => d.name.toLowerCase() === dropoff.trim().toLowerCase());
    return {
      tripType: trip, passengers: pax, pickup: pickup.trim(), dropoff: dropoff.trim() || undefined, stops: [],
      destinationSlug: trip === "outstation" ? dest?.slug : undefined, date, time,
      durationHours: needsHours.includes(trip) && hours ? Number(hours) : undefined,
      days: trip === "multi_day" ? days : undefined, addons: [],
    };
  }, [trip, pax, pickup, dropoff, date, time, hours, days, destinations]);
  const key = request ? JSON.stringify(request) : "";

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setQuote((s) => ({ ...s, loading: true }));
      try {
        const res = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: key, signal: ctrl.signal });
        const d = await res.json();
        setQuote(res.ok ? { q: d.quote, token: d.quoteToken, available: d.available } : { error: d.error });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setQuote({ error: "Network problem" });
      }
    }, 500);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [key]);

  const q = quote.q;
  const canBook = Boolean(q && quote.token && quote.available && name.trim().length >= 2 && normalizeGhanaPhone(phone));

  if (result?.ok && result.ref) {
    return (
      <Panel title="Booked">
        <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5 text-success" /> {result.message}</p>
        {result.url && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="lg" className="h-9 rounded-lg" onClick={() => navigator.clipboard.writeText(result.url!).then(() => toast.success("Link copied"))}><Copy /> Copy payment link</Button>
            <Button asChild size="lg" className="h-9 rounded-lg bg-[#25D366] text-white hover:bg-[#1fb857]">
              <a href={`https://wa.me/${(normalizeGhanaPhone(phone) ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${name.split(" ")[0]}, your Elsasu booking ${result.ref} is ready. Pay the deposit securely here: ${result.url}`)}`} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="size-4" /> Send on WhatsApp</a>
            </Button>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button asChild variant="accent" size="lg" className="h-9 rounded-lg"><Link href={`/admin/bookings/${result.ref}`}>Open booking</Link></Button>
          <Button variant="outline" size="lg" className="h-9 rounded-lg" onClick={() => { setResult(null); setQuote({}); }}>New booking</Button>
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        <Panel title="Trip">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="text-xs font-medium text-muted-foreground">Trip type
              <select value={trip} onChange={(e) => setTrip(e.target.value as TripType)} className={`${fieldCls} mt-1`}>
                {tripTypes.map((t) => <option key={t} value={t}>{tripTypeLabels[t]}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-muted-foreground">Passengers
              <input type="number" min={1} max={60} value={pax} onChange={(e) => setPax(Math.max(1, Math.min(60, Number(e.target.value) || 1)))} className={`${fieldCls} mt-1`} />
            </label>
            <div className="text-xs font-medium text-muted-foreground sm:col-span-2">Pick-up
              <LocationInput value={pickup} onChange={setPickup} quickPicks={popularPlaces} className="mt-1" inputClassName="h-10 text-sm" />
            </div>
            <div className="text-xs font-medium text-muted-foreground sm:col-span-2">{trip === "outstation" ? "Destination" : "Drop-off (optional)"}
              <LocationInput value={dropoff} onChange={setDropoff} quickPicks={trip === "outstation" ? destinations.map((d) => d.name) : popularPlaces} className="mt-1" inputClassName="h-10 text-sm" />
            </div>
            <label className="text-xs font-medium text-muted-foreground">Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${fieldCls} mt-1`} />
            </label>
            <label className="text-xs font-medium text-muted-foreground">Pick-up time
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${fieldCls} mt-1`} />
            </label>
            {needsHours.includes(trip) && (
              <label className="text-xs font-medium text-muted-foreground">Hours (optional)
                <input type="number" min={1} max={24} value={hours} onChange={(e) => setHours(e.target.value)} className={`${fieldCls} mt-1`} />
              </label>
            )}
            {trip === "multi_day" && (
              <label className="text-xs font-medium text-muted-foreground">Days
                <input type="number" min={1} max={30} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))} className={`${fieldCls} mt-1`} />
              </label>
            )}
          </div>
        </Panel>

        <Panel title="Customer">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="text-xs font-medium text-muted-foreground">Full name<input value={name} onChange={(e) => setName(e.target.value)} className={`${fieldCls} mt-1`} /></label>
            <label className="text-xs font-medium text-muted-foreground">Phone<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024 123 4567" className={`${fieldCls} mt-1`} /></label>
            <label className="text-xs font-medium text-muted-foreground">Email (optional)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${fieldCls} mt-1`} /></label>
            <label className="text-xs font-medium text-muted-foreground">Notes for the driver<input value={notes} onChange={(e) => setNotes(e.target.value)} className={`${fieldCls} mt-1`} /></label>
          </div>
        </Panel>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Panel title="Price">
          {quote.loading && !q ? <p className="text-sm text-muted-foreground">Calculating…</p> : q ? (
            <>
              <p className="text-3xl font-bold tracking-tight tabular-nums">{formatMoney(q.total)}</p>
              <p className="text-xs text-muted-foreground">Deposit {formatMoney(q.deposit)} · {q.vans.map((v) => v.name).join(" + ")}</p>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">{q.lines.map((l, i) => <li key={i} className="flex justify-between gap-2"><span>{l.label}</span><span>{formatMoney(l.amount)}</span></li>)}</ul>
              {!quote.available && <p className="mt-2 text-sm font-medium text-destructive">No van free at that time.</p>}
            </>
          ) : <p className="text-sm text-muted-foreground">{quote.error ?? "Enter pick-up and date."}</p>}
        </Panel>

        <Panel title="Payment">
          <div className="space-y-1.5 text-sm">
            {([["link", "Send a Paystack link (MoMo/card)"], ["cash", "Paid in cash now"], ["unpaid", "Pay later (hold van 7 days)"]] as const).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2"><input type="radio" name="paymode" checked={payMode === v} onChange={() => setPayMode(v)} /> {l}</label>
            ))}
            {payMode === "cash" && (
              <input type="number" min={0} step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} placeholder={q ? `Amount (deposit ${q.deposit})` : "Amount"} className={`${fieldCls} mt-1`} />
            )}
          </div>
          <Button variant="accent" size="lg" className="mt-3 h-10 w-full rounded-lg" disabled={!canBook || pending} onClick={() => start(async () => {
            const r = await createPhoneBooking({ quoteToken: quote.token!, name, phone, email, notes, payMode, cashAmount: cash ? Number(cash) : undefined });
            if (r.ok) toast.success(r.message);
            else toast.error(r.message);
            if (r.ok) setResult(r);
          })}>
            {pending && <Loader2 className="animate-spin" />} Create booking
          </Button>
        </Panel>
      </div>
    </div>
  );
}
