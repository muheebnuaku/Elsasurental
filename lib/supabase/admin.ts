import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Service-role client: BYPASSES RLS. Server-only — never import this from a client component.
// Used for things no visitor may do directly: promo lookups, availability counts, chat logging, webhooks.
export function createAdminClient() {
  if (typeof window !== "undefined") throw new Error("Admin client used in the browser");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
