"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { normalizeGhanaPhone } from "@/lib/phone";
import type { AdminResult } from "@/lib/actions/admin-bookings";

// Business contact details shown across the website, receipts, messages and the assistant.

const phone = z.string().transform((v, ctx) => {
  const e164 = normalizeGhanaPhone(v);
  if (!e164) ctx.addIssue({ code: "custom", message: "Enter a valid Ghana number, e.g. 054 541 5019." });
  return e164 ?? "";
});

const schema = z.object({
  phone,
  whatsapp: phone,
  email: z.string().trim().email("Enter a valid email address.").max(120),
  address: z.string().trim().min(2, "Enter the address.").max(200),
});

export async function saveBusiness(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details." };

  const { error } = await supabase.from("business_settings").upsert({ id: true, ...parsed.data });
  if (error) return { ok: false, message: "Couldn't save. Please try again." };

  updateTag("business");
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. The website, receipts and messages use the new details now." };
}
