"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/client";

/** Re-checks the payment while Paystack confirms (MoMo approvals can take a few seconds). */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      if (++n > 30) return clearInterval(id); // stop after ~2 minutes
      router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

/** Starts a new Paystack payment for this booking (retry, or pay the balance). */
export function PayAgainButton({ refCode, label = "Try payment again", variant = "accent" }: { refCode: string; label?: string; variant?: "accent" | "outline" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant={variant}
        size="xl"
        className="w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await fetch(`/api/bookings/${refCode}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
          const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
          if (data.url) {
            track("balance_payment_started", { ref: refCode });
            window.location.assign(data.url);
          }
          else {
            setError(data.error ?? "Couldn't start the payment.");
            setBusy(false);
          }
        }}
      >
        {busy && <Loader2 className="animate-spin" />} {label}
      </Button>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}

/** Cancel with a clear statement of the refund, behind a confirm step. */
export function CancelBooking({ refCode, refundText }: { refCode: string; refundText: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-sm font-medium text-destructive hover:underline">
        Cancel this booking
      </button>
    );
  }
  return (
    <div className="space-y-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-sm">{refundText} The van will be released for other customers.</p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          size="lg"
          className="h-10 rounded-xl"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const res = await fetch(`/api/bookings/${refCode}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
              setError(data.error ?? "Couldn't cancel. Please try again.");
              setBusy(false);
              return;
            }
            track("booking_cancelled_by_customer", { ref: refCode });
            router.refresh();
          }}
        >
          {busy && <Loader2 className="animate-spin" />} Yes, cancel
        </Button>
        <Button type="button" variant="outline" size="lg" className="h-10 rounded-xl" onClick={() => setConfirming(false)} disabled={busy}>
          Keep my booking
        </Button>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
