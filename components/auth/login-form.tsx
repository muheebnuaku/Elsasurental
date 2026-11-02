"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { formatGhanaPhone, normalizeGhanaPhone } from "@/lib/phone";
import { roleHome, safeNext } from "@/lib/auth";
import { identify } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

type Step = "phone" | "code" | "name";
const RESEND_SECONDS = 30;

/** Google sign-in shows only once it's switched on in Supabase (Authentication → Providers → Google). */
function useGoogleEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => r.json())
      .then((s: { external?: { google?: boolean } }) => setEnabled(Boolean(s.external?.google)))
      .catch(() => {});
  }, []);
  return enabled;
}

function GhanaFlag() {
  return (
    <svg viewBox="0 0 30 20" className="h-3.5 w-[21px] shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" aria-hidden>
      <path fill="#CE1126" d="M0 0h30v6.67H0z" />
      <path fill="#FCD116" d="M0 6.67h30v6.66H0z" />
      <path fill="#006B3F" d="M0 13.33h30V20H0z" />
      <path fill="#000" d="m15 6.9.9 2.6h2.8l-2.2 1.6.8 2.6-2.3-1.6-2.3 1.6.8-2.6-2.2-1.6h2.8z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.02c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28V6.61H1.29a12 12 0 0 0 0 10.78l4-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.29 6.61l4 3.11C6.23 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const supabase = createClient();
  const googleEnabled = useGoogleEnabled();

  const [step, setStep] = useState<Step>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "google" ? "Google sign-in didn't finish. Please try again, or use your phone number." : null,
  );
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

  async function signInWithGoogle() {
    setBusy(true);
    setError(null);
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback.toString() } });
    if (error) {
      setBusy(false);
      setError("Google sign-in isn't available right now. Please use your phone number.");
    }
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
            <h2 className="text-2xl font-semibold tracking-tight">Sign in or sign up</h2>
            <p className="mt-1 text-sm text-muted-foreground">New here? We create your account as you sign in.</p>
          </div>
          {googleEnabled && (
            <>
              <Button type="button" variant="outline" size="xl" className="w-full gap-3 font-medium" onClick={signInWithGoogle} disabled={busy}>
                <GoogleIcon /> Continue with Google
              </Button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or use your mobile number
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="login-phone">Mobile number</Label>
            <div className="flex h-12 items-center overflow-hidden rounded-xl border border-input bg-background focus-within:border-brand-orange focus-within:ring-3 focus-within:ring-brand-orange/25">
              <span className="flex h-full items-center gap-2 border-r bg-muted px-3 text-sm font-medium">
                <GhanaFlag /> +233
              </span>
              <input
                id="login-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
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
            {busy ? <Loader2 className="animate-spin" /> : <>Text me a code <ArrowRight data-icon="inline-end" /></>}
          </Button>
        </form>
      )}

      {step === "code" && phone && (
        <form onSubmit={(e) => { e.preventDefault(); verify(code); }} className="space-y-4">
          <button type="button" onClick={() => { setStep("phone"); setError(null); }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Change number
          </button>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Enter your code</h2>
            <p className="mt-1 text-sm text-muted-foreground">We texted a 6-digit code to <span className="font-medium text-foreground">{formatGhanaPhone(phone)}</span></p>
          </div>
          {/* One real input (keeps SMS autofill and paste working) drawn as six boxes. */}
          <div className="relative">
            <input
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
              aria-label="6-digit code"
              aria-invalid={Boolean(error)}
              className="peer absolute inset-0 z-10 w-full cursor-text opacity-0"
            />
            <div className="grid grid-cols-6 gap-2" aria-hidden>
              {Array.from({ length: 6 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "grid h-14 place-items-center rounded-xl border bg-background font-mono text-2xl font-semibold tabular-nums transition-colors",
                    i === Math.min(code.length, 5) && "peer-focus:border-brand-orange peer-focus:ring-3 peer-focus:ring-brand-orange/25",
                    error && "border-destructive/60",
                  )}
                >
                  {code[i] ?? ""}
                </span>
              ))}
            </div>
          </div>
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
            <h2 className="text-2xl font-semibold tracking-tight">Welcome! What&apos;s your name?</h2>
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
        <span>
          By continuing you agree to our <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">terms</Link> and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">privacy policy</Link>. We only use your details for bookings and trip updates.
        </span>
      </p>
    </div>
  );
}
