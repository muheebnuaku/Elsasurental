import type { Database } from "@/types/supabase";

type Role = Database["public"]["Enums"]["user_role"];

/** Where each role lands after signing in. */
export function roleHome(role: Role | null | undefined) {
  if (role === "admin") return "/admin";
  if (role === "driver") return "/driver";
  return "/account";
}

/** Only allow same-site relative redirects (prevents open-redirect tricks like //evil.com). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
