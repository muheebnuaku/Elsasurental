"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { setUserRole } from "@/lib/actions/admin-people";

/** "Make admin" / "Remove admin" with a confirmation. Drivers are managed on the Drivers page. */
export function CustomerRole({ userId, name, role }: { userId: string; name: string; role: string }) {
  const [pending, start] = useTransition();
  if (role === "driver") return <span className="text-xs text-muted-foreground">Driver</span>;
  const toAdmin = role !== "admin";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const ok = window.confirm(toAdmin ? `Give ${name} full admin access?` : `Remove admin access from ${name}?`);
        if (!ok) return;
        start(async () => {
          const r = await setUserRole(userId, toAdmin ? "admin" : "customer");
          if (r.ok) toast.success(r.message);
          else toast.error(r.message);
        });
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium whitespace-nowrap hover:bg-muted disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : toAdmin ? <ShieldCheck className="size-3.5" /> : <ShieldOff className="size-3.5" />}
      {toAdmin ? "Make admin" : "Remove admin"}
    </button>
  );
}
