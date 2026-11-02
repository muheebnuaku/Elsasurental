import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { AreaSkeleton } from "@/components/app/area-skeleton";
import { getSessionUser } from "@/lib/supabase/server";
import { roleHome } from "@/lib/auth";
import { formatGhanaPhone } from "@/lib/phone";

// Admins only: checked here on the server; Row-Level Security protects the data underneath.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AreaSkeleton />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect(roleHome(user.role));
  const name = user.fullName ?? "Admin";
  return (
    <AdminShell
      user={{
        name,
        detail: user.phone ? `Admin · ${formatGhanaPhone(user.phone)}` : "Admin",
        initials: name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(),
      }}
    >
      {children}
    </AdminShell>
  );
}
