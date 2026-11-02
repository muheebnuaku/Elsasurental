import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

// Browser client (anon key + the user's session cookie). RLS decides what it can see.
let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
