"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount, updateProfile, type ActionState } from "@/lib/actions/account";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm({ fullName, email, phone }: { fullName: string; email: string; phone: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProfile, null);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="pf-name">Full name</Label>
        <Input id="pf-name" name="fullName" defaultValue={fullName} autoComplete="name" required className="h-11 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-phone">Phone</Label>
        <Input id="pf-phone" value={phone} disabled className="h-11 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-email">Email (for receipts, optional)</Label>
        <Input id="pf-email" name="email" type="email" defaultValue={email} autoComplete="email" className="h-11 rounded-xl" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="accent" size="lg" className="h-10 rounded-xl px-4" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Save
        </Button>
        {state && <p className={cn("text-sm", state.ok ? "text-success" : "text-destructive")} role="status">{state.message}</p>}
      </div>
    </form>
  );
}

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(deleteAccount, null);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-destructive hover:underline">
        Delete my account
      </button>
    );
  }
  return (
    <form action={action} className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-sm">
        This removes your login and personal details. Past booking records are kept for tax purposes but no longer linked to you.
        Type <strong>DELETE</strong> to confirm.
      </p>
      <div className="flex gap-2">
        <Input name="confirm" autoComplete="off" className="h-10 rounded-xl" aria-label="Type DELETE to confirm" />
        <Button type="submit" variant="destructive" size="lg" className="h-10 rounded-xl" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Delete
        </Button>
      </div>
      {state && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
    </form>
  );
}

/** Set or change the password used with the phone number to sign in (accounts made at checkout have none). */
export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ActionState>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setState({ ok: false, message: "Use at least 8 characters." });
    setPending(true);
    const { error } = await createClient().auth.updateUser({ password });
    setPending(false);
    if (error) return setState({ ok: false, message: error.code === "weak_password" ? "Choose a stronger password." : "Couldn't save. Please try again." });
    setPassword("");
    setState({ ok: true, message: "Saved. Sign in with your number and this password." });
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="pw-new">New password</Label>
        <Input id="pw-new" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" size="lg" className="h-10 rounded-xl px-4" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Save password
        </Button>
        {state && <p className={cn("text-sm", state.ok ? "text-success" : "text-destructive")} role="status">{state.message}</p>}
      </div>
    </form>
  );
}
