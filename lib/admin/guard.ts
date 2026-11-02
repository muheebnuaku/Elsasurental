import { createClient, getSessionUser } from "@/lib/supabase/server";

export class ForbiddenError extends Error {}

/** For admin Server Actions: the caller must be a signed-in admin. RLS enforces the same in the database. */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") throw new ForbiddenError("Admins only");
  return { user, supabase: await createClient() };
}
