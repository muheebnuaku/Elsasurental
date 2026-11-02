"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";
import { formatGhanaPhone, normalizeGhanaPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { identify, track } from "@/lib/analytics/client";
import { codeCopy } from "@/lib/login-codes";

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
  // "sms": sign in with this number. "phone_change": add it to the signed-in (Google) account.
  const [otpType, setOtpType] = useState<"sms" | "phone_change">("sms");
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

    // Signed in with Google and no number yet: confirm this one and add it to the same account.
    if (data.user && !signedPhone) {
      const { error } = await supabase.auth.updateUser({ phone: e164 });
      if (error?.status === 429) return sendFailed(429);
      // Other errors: the SMS provider is often just slow and the text still arrives, so ask for it.
      if (error?.code !== "phone_exists") return askForCode("phone_change");
      // The number already has its own account: continue as that account (below).
    }

    // Verify this number first (also creates the customer's account).
    if (data.user) await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    if (error?.status === 429) return sendFailed(429);
    askForCode("sms"); // also on other errors: a slow SMS often still arrives
  }

  function askForCode(type: "sms" | "phone_change") {
    setBusy(false);
    setCode("");
    setOtpType(type);
    setOtpFor(e164);
    setTimeout(() => codeRef.current?.focus(), 80);
  }

  function sendFailed(status?: number) {
    setBusy(false);
    setError(status === 429 ? "Too many attempts. Please wait a minute." : "We couldn't send a code to that number.");
  }

  async function verify(token: string) {
    if (!otpFor || token.length !== 6) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.verifyOtp({ phone: otpFor, token, type: otpType });
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
        <span>
          Secure payment by Paystack: MTN, Telecel, AirtelTigo MoMo or card. We never see your PIN or card number. By paying you
          accept our{" "}
          <Link href="/terms" target="_blank" className="font-medium text-foreground underline underline-offset-2">
            terms and cancellation policy
          </Link>
          .
        </span>
      </p>

      <Dialog open={Boolean(otpFor)} onOpenChange={(o) => !o && !busy && setOtpFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Confirm your number</DialogTitle>
          <DialogDescription>
            {codeCopy.sentTo} {otpFor ? formatGhanaPhone(otpFor) : ""}. {otpType === "phone_change" ? "We'll add it to your account for trip updates." : "This keeps your booking safe and creates your account."}
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
