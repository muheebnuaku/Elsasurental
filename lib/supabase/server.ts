import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { sessionCookieOptions } from "@/lib/supabase/cookie-options";

// Per-request client acting AS the signed-in user (RLS applies). Use in Server Components,
// Server Actions and Route Handlers. Reads cookies, so call it inside <Suspense> in pages.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: sessionCookieOptions,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component: cookies are read-only there. proxy.ts refreshes sessions.
          }
        },
      },
    },
  );
}

export type SessionUser = {
  id: string;
  phone: string | null;
  fullName: string | null;
  email: string | null;
  role: Database["public"]["Enums"]["user_role"];
};

/** The signed-in user with their profile, or null. Verifies the token with Supabase Auth. Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, email, role")
    .eq("id", data.user.id)
    .maybeSingle();
  return {
    id: data.user.id,
    phone: profile?.phone ?? (data.user.phone ? `+${data.user.phone.replace(/^\+/, "")}` : null),
    fullName: profile?.full_name ?? null,
    email: profile?.email ?? data.user.email ?? null,
    role: profile?.role ?? "customer",
  };
});
