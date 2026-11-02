"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { formatGhanaPhone, normalizeGhanaPhone } from "@/lib/phone";
import { roleHome, safeNext } from "@/lib/auth";
import { identify } from "@/lib/analytics/client";

type Step = "phone" | "code" | "name";
const RESEND_SECONDS = 30;

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const supabase = createClient();

  const [step, setStep] = useState<Step>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [destination, setDestination] = useState("/account");
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const e164 = normalizeGhanaPhone(phoneInput);
    if (!e164) return setError("Enter a valid Ghana mobile number, e.g. 024 123 4567.");
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    setBusy(false);
    if (error) {
      return setError(
        error.status === 429 ? "Too many attempts. Please wait a minute and try again." : "We couldn't send a code to that number. Please try again.",
      );
    }
    setPhone(e164);
    setCode("");
    setStep("code");
    setResendIn(RESEND_SECONDS);
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function verify(token: string) {
    if (!phone || token.length !== 6) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    if (error || !data.user) {
      setBusy(false);
      setCode("");
      return setError("That code isn't right or has expired. Check the SMS and try again.");
    }
    identify(data.user.id);
    const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", data.user.id).maybeSingle();
    const dest = next ?? roleHome(profile?.role);
    setDestination(dest);
    setBusy(false);
    if (!profile?.full_name) return setStep("name");
    finish(dest);
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.length < 2) return setError("Please enter your name.");
    setBusy(true);
    setError(null);
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("profiles").update({ full_name: clean.slice(0, 80) }).eq("id", data.user.id);
    finish(destination);
  }

  function finish(dest: string) {
    router.replace(dest);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      {step === "phone" && (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in or create an account</h1>
            <p className="mt-1 text-sm text-muted-foreground">We&apos;ll text you a 6-digit code. No password needed.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-phone">Mobile number</Label>
            <div className="flex h-12 items-center overflow-hidden rounded-xl border border-input bg-background focus-within:ring-3 focus-within:ring-ring/50">
              <span className="flex h-full items-center border-r bg-muted px-3 text-sm font-medium text-muted-foreground">🇬🇭 +233</span>
              <input
                id="login-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                autoFocus
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="024 123 4567"
                className="h-full flex-1 bg-transparent px-3 text-base outline-none"
                aria-invalid={Boolean(error)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" variant="accent" size="xl" className="w-full" disabled={busy || phoneInput.trim().length < 9}>
            {busy ? <Loader2 className="animate-spin" /> : <>Send code <ArrowRight data-icon="inline-end" /></>}
          </Button>
        </form>
      )}

      {step === "code" && phone && (
        <form onSubmit={(e) => { e.preventDefault(); verify(code); }} className="space-y-4">
          <button type="button" onClick={() => { setStep("phone"); setError(null); }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Change number
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Enter your code</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sent to <span className="font-medium text-foreground">{formatGhanaPhone(phone)}</span></p>
          </div>
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
            pattern="\d{6}"
            maxLength={6}
            placeholder="••••••"
            aria-label="6-digit code"
            aria-invalid={Boolean(error)}
            className="h-14 rounded-xl text-center font-mono text-2xl tracking-[0.5em]"
          />
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" variant="accent" size="xl" className="w-full" disabled={busy || code.length !== 6}>
            {busy ? <Loader2 className="animate-spin" /> : "Verify"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {resendIn > 0 ? (
              <>Resend code in {resendIn}s</>
            ) : (
              <button type="button" onClick={() => sendCode()} className="font-semibold text-foreground hover:underline">Resend code</button>
            )}
          </p>
        </form>
      )}

      {step === "name" && (
        <form onSubmit={saveName} className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome! What&apos;s your name?</h1>
            <p className="mt-1 text-sm text-muted-foreground">So your driver knows who to look for.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-name">Full name</Label>
            <Input id="login-name" autoComplete="name" autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl text-base" />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" variant="accent" size="xl" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : "Continue"}
          </Button>
        </form>
      )}

      <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        By continuing you agree to our terms and privacy policy. We only use your number for bookings and trip updates.
      </p>
    </div>
  );
}
