"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { roleHome } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Me = { name: string | null; href: string } | null;

/** "Sign in", or the signed-in user's initials linking to their area. Runs in the browser so pages stay static. */
export function UserButton({ className, variant = "icon" }: { className?: string; variant?: "icon" | "row" }) {
  const [me, setMe] = useState<Me | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setMe(null);
      const { data: p } = await supabase.from("profiles").select("full_name, role").eq("id", data.user.id).maybeSingle();
      setMe({ name: p?.full_name ?? null, href: roleHome(p?.role) });
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  if (me === undefined) return <span className={cn("size-10", variant === "row" && "hidden")} aria-hidden />;

  const initials = me?.name?.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  if (variant === "row") {
    return (
      <Link href={me ? me.href : "/login"} className={cn("flex items-center gap-3 rounded-xl px-4 py-2.5 text-base font-medium hover:bg-muted", className)}>
        <UserRound className="size-5" /> {me ? "My account" : "Sign in"}
      </Link>
    );
  }

  return me ? (
    <Link
      href={me.href}
      aria-label="My account"
      title={me.name ?? "My account"}
      className={cn("grid size-9 place-items-center rounded-full bg-brand-ink text-xs font-semibold text-white dark:bg-white dark:text-brand-ink", className)}
    >
      {initials || <UserRound className="size-4" />}
    </Link>
  ) : (
    <Link href="/login" className={cn("inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium hover:bg-muted", className)}>
      <UserRound className="size-4" /> <span className="hidden sm:inline">Sign in</span>
    </Link>
  );
}
