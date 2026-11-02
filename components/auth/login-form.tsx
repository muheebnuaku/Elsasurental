"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { formatGhanaPhone, normalizeGhanaPhone } from "@/lib/phone";
import { roleHome, safeNext } from "@/lib/auth";
import { identify } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";
import { codeCopy } from "@/lib/login-codes";

// Phone + password accounts. A text code is needed only to confirm a new number (once, at
// registration) or to reset a forgotten password. Signing in is instant.
//   register: name + phone + password → signUp → one code → in
//   signin:   phone + password → signInWithPassword → in
//   reset:    phone → one code → new password → in

export type AuthMode = "signin" | "register";
type Step = "form" | "reset" | "code" | "new-password" | "name";
const RESEND_SECONDS = 60; // SMS can be slow, and each resend cancels the previous code
const MIN_PASSWORD = 8;

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

function PhoneField({ id, value, onChange, invalid }: { id: string; value: string; onChange: (v: string) => void; invalid: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Mobile number</Label>
      <div className="flex h-12 items-center overflow-hidden rounded-xl border border-input bg-background focus-within:border-brand-orange focus-within:ring-3 focus-within:ring-brand-orange/25">
        <span className="flex h-full items-center gap-2 border-r bg-muted px-3 text-base font-medium">
          <GhanaFlag /> +233
        </span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="024 123 4567"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-base outline-none"
          aria-invalid={invalid}
        />
      </div>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete, hint }: {
  id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string; hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex h-12 items-center overflow-hidden rounded-xl border border-input bg-background focus-within:border-brand-orange focus-within:ring-3 focus-within:ring-brand-orange/25">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-base outline-none"
        />
        <button type="button" onClick={() => setShow((s) => !s)} className="grid h-full w-11 place-items-center text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function LoginForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const supabase = createClient();
  const googleEnabled = useGoogleEnabled();
  const switchHref = (to: string) => (next ? `${to}?next=${encodeURIComponent(next)}` : to);

  const [step, setStep] = useState<Step>("form");
  // Why we're asking for a code: confirming a new account, or resetting a password.
  const [codeFor, setCodeFor] = useState<"register" | "reset">("register");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "google" ? "Google sign-in didn't finish. Please try again, or use your phone number." : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [destination, setDestination] = useState("/account");
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  function readPhone() {
    const e164 = normalizeGhanaPhone(phoneInput);
    if (!e164) setError("Enter a valid Ghana mobile number, e.g. 024 123 4567.");
    return e164;
  }

  function showCodeStep(e164: string, purpose: "register" | "reset", slow: boolean) {
    setPhone(e164);
    setCodeFor(purpose);
    setCode("");
    setNotice(slow ? "This is taking a little longer than usual. If no code arrives within a minute, tap Resend code." : null);
    setStep("code");
    setResendIn(RESEND_SECONDS);
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function goTo(userId: string) {
    identify(userId);
    const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", userId).maybeSingle();
    const dest = next ?? roleHome(profile?.role);
    setDestination(dest);
    setBusy(false);
    if (!profile?.full_name) return setStep("name");
    router.replace(dest);
    router.refresh();
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const e164 = readPhone();
    if (!e164 || !password) return;
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ phone: e164, password });
    if (error || !data.user) {
      setBusy(false);
      if (error?.code === "phone_not_confirmed") {
        await supabase.auth.resend({ type: "sms", phone: e164 });
        return showCodeStep(e164, "register", false);
      }
      if (error?.status === 429) return setError("Too many attempts. Please wait a minute and try again.");
      return setError("That phone number and password don't match. Check them, or tap Forgot password.");
    }
    await goTo(data.user.id);
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.length < 2) return setError("Please enter your full name.");
    const e164 = readPhone();
    if (!e164) return;
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ phone: e164, password, options: { data: { full_name: clean.slice(0, 80) } } });
    setBusy(false);
    if (error?.code === "user_already_exists" || error?.code === "phone_exists" || /already registered/i.test(error?.message ?? "")) {
      return setError("This number already has an account. Sign in instead, or use Forgot password to set a new one.");
    }
    if (error?.code === "weak_password") return setError("Please choose a stronger password (mix letters and numbers).");
    if (error?.status === 429) return setError("Too many attempts. Please wait a minute and try again.");
    if (data.session && data.user) return goTo(data.user.id); // confirmation switched off
    // A slow SMS provider can make signUp report an error even though the code is on its way.
    showCodeStep(e164, "register", Boolean(error));
  }

  async function sendResetCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    const e164 = phone ?? readPhone();
    if (!e164) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: e164, options: { shouldCreateUser: false } });
    setBusy(false);
    if (error?.status === 429) return setError("Too many attempts. Please wait a minute and try again.");
    if (error?.code === "otp_disabled" || /signups? not allowed|not found/i.test(error?.message ?? "")) {
      return setError("We couldn't find an account for that number. Create one instead.");
    }
    showCodeStep(e164, "reset", Boolean(error));
  }

  async function resend() {
    if (!phone) return;
    setError(null);
    if (codeFor === "reset") return sendResetCode();
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: "sms", phone });
    setBusy(false);
    if (error?.status === 429) return setError("Too many attempts. Please wait a minute and try again.");
    setResendIn(RESEND_SECONDS);
  }

  async function verify(token: string) {
    if (!phone || token.length !== 6) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    if (error || !data.user) {
      setBusy(false);
      setCode("");
      return setError(codeCopy.wrong);
    }
    if (codeFor === "reset") {
      setBusy(false);
      setPassword("");
      return setStep("new-password");
    }
    await goTo(data.user.id);
  }

  async function saveNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error || !data.user) {
      setBusy(false);
      return setError(error?.code === "weak_password" ? "Please choose a stronger password." : "Couldn't save your password. Please try again.");
    }
    await goTo(data.user.id);
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.length < 2) return setError("Please enter your name.");
    setBusy(true);
    setError(null);
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("profiles").update({ full_name: clean.slice(0, 80) }).eq("id", data.user.id);
    router.replace(destination);
    router.refresh();
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

  const errorLine = error && <p className="text-sm text-destructive" role="alert">{error}</p>;
  const back = (label: string, to: Step) => (
    <button type="button" onClick={() => { setStep(to); setError(null); }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> {label}
    </button>
  );

  return (
    <div className="w-full">
      {step === "form" && (
        <form onSubmit={mode === "signin" ? signIn : register} className="space-y-4" noValidate>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>New to Elsasu? <Link href={switchHref("/register")} className="font-semibold text-foreground underline-offset-4 hover:underline">Create an account</Link></>
              ) : (
                <>Already have one? <Link href={switchHref("/login")} className="font-semibold text-foreground underline-offset-4 hover:underline">Sign in</Link></>
              )}
            </p>
          </div>

          {googleEnabled && (
            <>
              <Button type="button" variant="outline" size="xl" className="w-full gap-3 font-medium" onClick={signInWithGoogle} disabled={busy}>
                <GoogleIcon /> Continue with Google
              </Button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or with your phone number
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-name">Full name</Label>
              <Input id="auth-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl px-3 text-base md:text-base" />
            </div>
          )}
          <PhoneField id="auth-phone" value={phoneInput} onChange={setPhoneInput} invalid={Boolean(error)} />
          <PasswordField
            id="auth-password"
            label={mode === "signin" ? "Password" : "Choose a password"}
            value={password}
            onChange={setPassword}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            hint={mode === "register" ? `At least ${MIN_PASSWORD} characters. You'll use it to sign in next time.` : undefined}
          />
          {mode === "signin" && (
            <div className="-mt-1 text-right">
              <button type="button" onClick={() => { setStep("reset"); setError(null); }} className="text-sm font-medium text-brand-orange-text hover:underline">
                Forgot password?
              </button>
            </div>
          )}
          {errorLine}
          <Button type="submit" variant="accent" size="xl" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
          {mode === "register" && <p className="text-center text-xs text-muted-foreground">{codeCopy.registerLine}</p>}
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={sendResetCode} className="space-y-4" noValidate>
          {back("Back to sign in", "form")}
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Reset your password</h2>
            <p className="mt-1 text-sm text-muted-foreground">{codeCopy.resetLine}</p>
          </div>
          <PhoneField id="reset-phone" value={phoneInput} onChange={setPhoneInput} invalid={Boolean(error)} />
          {errorLine}
          <Button type="submit" variant="accent" size="xl" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : codeCopy.sendButton}
          </Button>
        </form>
      )}

      {step === "code" && phone && (
        <form onSubmit={(e) => { e.preventDefault(); verify(code); }} className="space-y-4">
          {back("Change number", codeFor === "reset" ? "reset" : "form")}
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{codeFor === "reset" ? "Enter your code" : "Confirm your number"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{codeCopy.sentTo} <span className="font-medium text-foreground">{formatGhanaPhone(phone)}</span></p>
          </div>
          {notice && <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{notice}</p>}
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
                    "grid h-14 place-items-center rounded-xl border-2 bg-background font-mono text-2xl font-semibold tabular-nums transition-all duration-150",
                    // Filled boxes light up orange; the next empty one shows where you're typing.
                    code[i] ? "scale-[1.03] border-brand-orange bg-brand-orange/10 text-foreground" : "border-input",
                    !code[i] && i === code.length && "peer-focus:border-brand-orange/60 peer-focus:ring-3 peer-focus:ring-brand-orange/20",
                    error && "border-destructive/60 bg-destructive/5",
                  )}
                >
                  {code[i] ?? ""}
                </span>
              ))}
            </div>
          </div>
          {errorLine}
          <Button type="submit" variant="accent" size="xl" className="w-full" disabled={busy || code.length !== 6}>
            {busy ? <Loader2 className="animate-spin" /> : "Confirm"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {resendIn > 0 ? (
              <>Didn&apos;t get it? You can get a new code in {resendIn}s</>
            ) : (
              <button type="button" onClick={resend} disabled={busy} className="font-semibold text-foreground hover:underline">{codeCopy.resend}</button>
            )}
          </p>
        </form>
      )}

      {step === "new-password" && (
        <form onSubmit={saveNewPassword} className="space-y-4" noValidate>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Choose a new password</h2>
            <p className="mt-1 text-sm text-muted-foreground">Next time, sign in with your number and this password. No code needed.</p>
          </div>
          <PasswordField id="new-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" hint={`At least ${MIN_PASSWORD} characters.`} />
          {errorLine}
          <Button type="submit" variant="accent" size="xl" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : "Save and continue"}
          </Button>
        </form>
      )}

      {step === "name" && (
        <form onSubmit={saveName} className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">What&apos;s your name?</h2>
            <p className="mt-1 text-sm text-muted-foreground">So your driver knows who to look for.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-name">Full name</Label>
            <Input id="login-name" autoComplete="name" autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl px-3 text-base md:text-base" />
          </div>
          {errorLine}
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
