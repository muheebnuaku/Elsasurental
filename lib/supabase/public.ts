import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Cookie-free anon client for public catalogue reads (vans, prices, destinations).
// Safe inside "use cache" because it never depends on who is visiting. RLS still applies.
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
