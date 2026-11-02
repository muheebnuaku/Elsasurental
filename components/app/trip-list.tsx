import Link from "next/link";
import { CalendarClock, MapPin, Users } from "lucide-react";
import { bookingStatus, type BookingStatus } from "@/lib/booking-status";
import { tripTypeLabels } from "@/lib/content";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TripType } from "@/lib/catalog";

export type TripRow = {
  id: string;
  ref_code: string;
  trip_type: TripType;
  status: BookingStatus;
  start_at: string;
  passengers: number;
  pickup: unknown;
  dropoff: unknown;
  total: number;
  amount_paid: number;
  contact_name?: string;
  contact_phone?: string;
};

const place = (p: unknown) =>
  p && typeof p === "object" && "address" in p && typeof (p as { address: unknown }).address === "string"
    ? (p as { address: string }).address
    : null;

export function TripList({ trips, showCustomer = false, showMoney = true, linkDetails = false, hrefBase }: { trips: TripRow[]; showCustomer?: boolean; showMoney?: boolean; linkDetails?: boolean; hrefBase?: string }) {
  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
      {trips.map((t) => {
        const s = bookingStatus[t.status];
        const from = place(t.pickup);
        const to = place(t.dropoff);
        return (
          <li key={t.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {hrefBase ? (
                  <Link href={`${hrefBase}${t.ref_code}`} className="font-mono text-sm font-semibold underline-offset-4 hover:underline">{t.ref_code}</Link>
                ) : linkDetails ? (
                  <Link href={`/book/confirmation?ref=${t.ref_code}`} className="font-mono text-sm font-semibold underline-offset-4 hover:underline">{t.ref_code}</Link>
                ) : (
                  <span className="font-mono text-sm font-semibold">{t.ref_code}</span>
                )}
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", s.className)}>{s.label}</span>
                <span className="text-xs text-muted-foreground">{tripTypeLabels[t.trip_type]}</span>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 truncate text-sm">
                <MapPin className="size-3.5 shrink-0 text-brand-orange" />
                <span className="truncate">{from ?? "Pick-up"}{to ? ` → ${to}` : ""}</span>
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" /> {formatDateTime(t.start_at)}</span>
                <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {t.passengers}</span>
                {showCustomer && t.contact_name && (
                  <span>
                    {t.contact_name}
                    {t.contact_phone && (
                      <> · <a href={`tel:${t.contact_phone}`} className="font-medium text-foreground hover:underline">{t.contact_phone}</a></>
                    )}
                  </span>
                )}
              </p>
            </div>
            {showMoney && (
              <div className="shrink-0 text-left sm:text-right">
                <p className="font-semibold tabular-nums">{formatMoney(t.total)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {t.amount_paid >= t.total ? "Paid in full" : `Paid ${formatMoney(t.amount_paid)}`}
                </p>
                {linkDetails && !["cancelled", "refunded"].includes(t.status) && (
                  <Link href={`/book/confirmation?ref=${t.ref_code}`} className="text-xs font-semibold text-brand-orange-text hover:underline">
                    {t.amount_paid < t.total ? "Pay / view" : "Receipt"}
                  </Link>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function EmptyTrips({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {cta && (
        <Link href={cta.href} className="mt-4 inline-flex h-10 items-center rounded-xl bg-brand-orange px-4 text-sm font-semibold text-brand-ink">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
