import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { CalendarPlus, CheckCircle2, Clock3, FileDown, MapPin, Users, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { AutoRefresh, CancelBooking, PayAgainButton } from "@/components/booking/confirmation-actions";
import { refundFor } from "@/lib/booking/cancellation";
import { getSessionUser } from "@/lib/supabase/server";
import { loadBookingGroup, place, reconcilePayment } from "@/lib/booking/details";
import { tripTypeLabels } from "@/lib/content";
import { formatDateTime, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

export default function ConfirmationPage({ searchParams }: PageProps<"/book/confirmation">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Confirmation searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Confirmation({ searchParams }: { searchParams: PageProps<"/book/confirmation">["searchParams"] }) {
  await connection(); // personal, per-request page
  const sp = await searchParams;
  const ref = typeof sp.ref === "string" ? sp.ref : null;
  const reference = typeof sp.reference === "string" ? sp.reference : typeof sp.trxref === "string" ? sp.trxref : null;

  const user = await getSessionUser();
  if (!ref) return <Message title="Booking not found" body="Check the link in your message, or find your trips in your account." />;
  if (!user) {
    return (
      <Message title="Sign in to see your booking" body={`Use the phone number you booked with to view booking ${ref}.`}>
        <Button asChild variant="accent" size="xl" className="mt-4"><Link href={`/login?next=${encodeURIComponent(`/book/confirmation?ref=${ref}`)}`}>Sign in</Link></Button>
      </Message>
    );
  }

  if (reference) await reconcilePayment(reference);
  const g = await loadBookingGroup(ref);
  if (!g) return <Message title="Booking not found" body="This booking isn't linked to your number." />;

  const latest = g.payments.find((p) => p.kind !== "refund");
  const refundRows = g.payments.filter((p) => p.kind === "refund" && p.status !== "failed");
  const refunds = {
    total: refundRows.reduce((s, p) => s + Number(p.amount), 0),
    pending: refundRows.filter((p) => p.status === "pending").length,
  };
  const cancellable = !g.cancelled && ["pending_payment", "confirmed", "assigned"].includes(g.lead.status);
  const preview = refundFor(g.lead.start_at, g.paid);
  const state = g.cancelled ? "cancelled" : g.paid > 0 ? "paid" : latest?.status === "pending" ? "confirming" : "unpaid";
  const from = place(g.lead.pickup);
  const to = place(g.lead.dropoff);
  const shareText = `Our Elsasu trip is booked! Ref ${g.lead.ref_code}: ${tripTypeLabels[g.lead.trip_type]}, ${formatDateTime(g.lead.start_at)}${from ? `, pick-up ${from}` : ""}.`;

  return (
    <div className="space-y-4">
      {state === "paid" && (
        <Banner icon={CheckCircle2} tone="success" title="You're booked!" body={g.balance > 0 ? `Deposit received. Balance of ${formatMoney(g.balance)} is due before the trip.` : "Paid in full. See you on the day!"} />
      )}
      {state === "confirming" && (
        <>
          <Banner icon={Clock3} tone="warning" title="Confirming your payment…" body="This usually takes a few seconds. Approve the MoMo prompt on your phone if you haven't yet." />
          <AutoRefresh seconds={4} />
        </>
      )}
      {state === "unpaid" && (
        <Banner icon={XCircle} tone="destructive" title="Payment not completed" body="Your van is held for a short while. Try again to confirm your booking.">
          <PayAgainButton refCode={g.lead.ref_code} />
        </Banner>
      )}
      {state === "cancelled" && (
        <Banner
          icon={XCircle}
          tone="destructive"
          title="This booking was cancelled"
          body={
            refunds.total > 0
              ? refunds.pending > 0
                ? `Your refund of ${formatMoney(refunds.total)} is on its way to your original payment method (5–10 working days).`
                : `Refunded ${formatMoney(refunds.total)} to your original payment method.`
              : "No payment was taken, or no refund applied under our cancellation policy."
          }
        />
      )}

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between gap-3 bg-brand-ink px-4 py-3 text-white sm:px-5">
          <div>
            <p className="text-xs text-white/60">Booking reference</p>
            <p className="font-mono text-2xl font-semibold tracking-wider">{g.lead.ref_code}</p>
          </div>
          <p className="text-right text-sm text-white/75">{tripTypeLabels[g.lead.trip_type]}</p>
        </div>
        <div className="space-y-2.5 p-4 text-sm sm:p-5">
          <p className="flex items-start gap-2"><Clock3 className="mt-0.5 size-4 shrink-0 text-brand-orange" /> {formatDateTime(g.lead.start_at)}</p>
          <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-brand-orange" /> {from ?? "Pick-up"}{to ? ` → ${to}` : ""}</p>
          <p className="flex items-start gap-2">
            <Users className="mt-0.5 size-4 shrink-0 text-brand-orange" />
            {g.bookings.reduce((s, b) => s + b.passengers, 0)} passengers · {g.bookings.length} van{g.bookings.length > 1 ? "s" : ""}
            {g.bookings.length > 1 && <span className="text-muted-foreground"> ({g.bookings.map((b) => b.ref_code).join(", ")})</span>}
          </p>
        </div>
        <dl className="grid grid-cols-3 border-t text-center text-sm">
          <Money label="Total" value={g.total} />
          <Money label="Paid" value={g.paid} />
          <Money label="Balance" value={g.balance} highlight={g.balance > 0 && g.paid > 0} />
        </dl>
      </section>

      {state === "paid" && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Action href={`/api/bookings/${g.lead.ref_code}/calendar`} icon={CalendarPlus} label="Add to calendar" />
          <Action href={`/api/bookings/${g.lead.ref_code}/receipt`} icon={FileDown} label="Receipt (PDF)" />
          <Action href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} icon={WhatsAppIcon} label="Share with group" external />
          <Action href="/account" icon={Users} label="My trips" />
        </div>
      )}
      {state === "paid" && g.balance > 0 && <PayAgainButton refCode={g.lead.ref_code} label={`Pay balance ${formatMoney(g.balance)}`} variant="outline" />}
      {cancellable && (
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="font-semibold">Need to cancel?</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Full refund more than 48 hours before pick-up, 50% between 24 and 48 hours, none within 24 hours.
          </p>
          <CancelBooking
            refCode={g.lead.ref_code}
            refundText={
              g.paid > 0
                ? preview.amount > 0
                  ? `Cancel now and get ${formatMoney(preview.amount)} back (${preview.pct}%).`
                  : "Cancelling now doesn't qualify for a refund under our policy."
                : "No payment has been taken, so there's nothing to refund."
            }
          />
        </section>
      )}
      {state !== "cancelled" && (
        <p className="text-center text-xs text-muted-foreground">Your driver&apos;s details are sent on WhatsApp/SMS before the trip.</p>
      )}
    </div>
  );
}

function Banner({ icon: Icon, tone, title, body, children }: { icon: React.ComponentType<{ className?: string }>; tone: "success" | "warning" | "destructive"; title: string; body: string; children?: React.ReactNode }) {
  const color = { success: "text-success bg-success/10", warning: "bg-warning/15", destructive: "text-destructive bg-destructive/10" }[tone];
  return (
    <div className="flex gap-3 rounded-2xl border bg-card p-4 sm:p-5">
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${color}`}><Icon className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{body}</p>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}

function Money({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="border-r p-3 last:border-r-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`font-semibold tabular-nums ${highlight ? "text-brand-orange-text" : ""}`}>{formatMoney(value)}</dd>
    </div>
  );
}

function Action({ href, icon: Icon, label, external }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; external?: boolean }) {
  return (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}
      className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-3 text-center text-xs font-medium transition-colors hover:border-brand-orange/40 hover:bg-muted">
      <Icon className="size-5 text-brand-orange" /> {label}
    </a>
  );
}

function Message({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}
