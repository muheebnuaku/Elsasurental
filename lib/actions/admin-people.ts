"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import type { AdminResult } from "@/lib/actions/admin-bookings";

// Customers and admins. Drivers are managed on the Drivers page (they need a licence record).

const roleChange = z.object({ userId: z.guid(), role: z.enum(["customer", "admin"]) });

export async function setUserRole(userId: string, role: "customer" | "admin"): Promise<AdminResult> {
  const { supabase, user } = await requireAdmin();
  const parsed = roleChange.safeParse({ userId, role });
  if (!parsed.success) return { ok: false, message: "Something's not right. Refresh and try again." };
  if (userId === user.id) return { ok: false, message: "You can't change your own access." };

  if (role === "customer") {
    const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) return { ok: false, message: "There must always be at least one admin." };
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false, message: "Couldn't change their access." };
  revalidatePath("/admin/customers");
  return { ok: true, message: role === "admin" ? "They're now an admin." : "Admin access removed." };
}
