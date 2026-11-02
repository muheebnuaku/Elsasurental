import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { sessionCookieOptions } from "@/lib/supabase/cookie-options";

// Browser client (anon key + the user's session cookie). RLS decides what it can see.
let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: sessionCookieOptions },
  );
  return client;
}
