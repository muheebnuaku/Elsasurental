import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/supabase/server";
import { roleHome } from "@/lib/auth";
import { AppShell, type AreaNavItem } from "@/components/app/app-shell";

/**
 * Server-side gate for signed-in areas. Must sit inside <Suspense> (reads cookies).
 * Wrong role → sent to their own area. RLS still protects the data underneath.
 */
export async function AreaGate({
  allow,
  path,
  nav,
  children,
}: {
  allow: SessionUser["role"][];
  path: string;
  nav: AreaNavItem[];
  children: React.ReactNode;
}) {
  await connection(); // per-request: the session check reads cookies and the clock
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!allow.includes(user.role)) redirect(roleHome(user.role));
  return (
    <AppShell user={user} nav={nav}>
      {children}
    </AppShell>
  );
}
