"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionState = { ok: boolean; message: string } | null;

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name.").max(80),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email("That email doesn't look right.").max(120)]),
});

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse({ fullName: formData.get("fullName"), email: formData.get("email") ?? "" });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your details." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/account");

  // RLS only lets users update their own row; a trigger blocks role/company changes.
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, email: parsed.data.email || null })
    .eq("id", data.user.id);
  if (error) return { ok: false, message: "Couldn't save. Please try again." };
  revalidatePath("/account");
  return { ok: true, message: "Saved." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Ghana Data Protection Act: customers can delete their account. Booking records are kept (tax), unlinked. */
export async function deleteAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (formData.get("confirm") !== "DELETE") return { ok: false, message: 'Type DELETE to confirm.' };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile?.role === "admin" || profile?.role === "driver") {
    return { ok: false, message: "Staff accounts are removed by an administrator." };
  }

  const { error } = await createAdminClient().auth.admin.deleteUser(data.user.id);
  if (error) return { ok: false, message: "Couldn't delete your account. Please contact us." };
  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
