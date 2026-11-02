"use client";

import { useRef, useState } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";
import { formatGhanaPhone, normalizeGhanaPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { identify, track } from "@/lib/analytics/client";

type Props = {
  quoteToken: string;
  total: number;
  deposit: number;
  depositPct: number;
  name: string;
  phone: string;
  email: string;
  notes: string;
  onExpired: () => void;
};

/**
 * Last step: pick deposit or full, verify the phone by SMS code if needed (creates the account),
 * create the booking and go to Paystack (MoMo or card).
 */
export function Checkout({ quoteToken, total, deposit, depositPct, name, phone, email, notes, onExpired }: Props) {
  const supabase = createClient();
  const [choice, setChoice] = useState<"deposit" | "full">("deposit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpFor, setOtpFor] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);

  const e164 = normalizeGhanaPhone(phone);
  const canPay = name.trim().length >= 2 && Boolean(e164);
  const amount = choice === "full" ? total : deposit;

  async function start() {
    if (!e164) return setError("Enter a valid Ghana mobile number.");
    setBusy(true);
    setError(null);
    const { data } = await supabase.auth.getUser();
    const signedPhone = data.user?.phone ? `+${data.user.phone.replace(/^\+/, "")}` : null;
    if (data.user && signedPhone === e164) return book();

    // Verify this number first (also creates the customer's account).
    if (data.user) await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    setBusy(false);
    if (error) return setError(error.status === 429 ? "Too many attempts. Please wait a minute." : "We couldn't send a code to that number.");
    setCode("");
    setOtpFor(e164);
    setTimeout(() => codeRef.current?.focus(), 80);
  }

  async function verify(token: string) {
    if (!otpFor || token.length !== 6) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.verifyOtp({ phone: otpFor, token, type: "sms" });
    if (error) {
      setBusy(false);
      setCode("");
      return setError("That code isn't right or has expired.");
    }
    if (data.user) identify(data.user.id);
    setOtpFor(null);
    await book();
  }

  async function book() {
    setBusy(true);
    track("checkout_started", { payment: choice, amount });
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteToken, name: name.trim(), email: email.trim(), notes: notes.trim() || undefined, payment: choice }),
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; ref?: string; error?: string };
    if (data.url) {
      track("payment_redirected", { ref: data.ref ?? null, payment: choice, amount });
      return window.location.assign(data.url);
    }
    setBusy(false);
    if (res.status === 410) onExpired();
    setError(data.error ?? "Something went wrong. Please try again.");
    if (data.ref) setError(`${data.error ?? "Payment couldn't start."} Your booking ${data.ref} is held for 30 minutes.`);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How much to pay now">
        {([["deposit", `${depositPct}% deposit`, deposit], ["full", "Pay in full", total]] as const).map(([value, label, amt]) => (
          <label
            key={value}
            className={cn(
              "cursor-pointer rounded-xl border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              choice === value ? "border-brand-orange bg-brand-orange/5" : "hover:border-foreground/30",
            )}
          >
            <input type="radio" name="pay" value={value} checked={choice === value} onChange={() => setChoice(value)} className="sr-only" />
            <span className="block text-xs text-muted-foreground">{label}</span>
            <span className="block font-semibold tabular-nums">{formatMoney(amt)}</span>
          </label>
        ))}
      </div>

      <Button type="button" variant="accent" size="xl" className="w-full" disabled={!canPay || busy} onClick={start}>
        {busy ? <Loader2 className="animate-spin" /> : <Lock />}
        {canPay ? `Pay ${formatMoney(amount)}` : "Add your name & phone to book"}
      </Button>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        Secure payment by Paystack: MTN, Telecel, AirtelTigo MoMo or card. We never see your PIN or card number.
      </p>

      <Dialog open={Boolean(otpFor)} onOpenChange={(o) => !o && !busy && setOtpFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Confirm your number</DialogTitle>
          <DialogDescription>
            We sent a 6-digit code to {otpFor ? formatGhanaPhone(otpFor) : ""}. This keeps your booking safe and creates your account.
          </DialogDescription>
          <Input
            ref={codeRef}
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(v);
              if (v.length === 6) verify(v);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            aria-label="6-digit code"
            className="h-14 rounded-xl text-center font-mono text-2xl tracking-[0.5em]"
          />
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="button" variant="accent" size="xl" disabled={busy || code.length !== 6} onClick={() => verify(code)}>
            {busy ? <Loader2 className="animate-spin" /> : "Confirm & pay"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
