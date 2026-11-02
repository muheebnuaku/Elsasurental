import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Search } from "lucide-react";
import { CustomerRole } from "@/components/admin/customer-role";
import { createClient } from "@/lib/supabase/server";
import { formatGhanaPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers · Admin", robots: { index: false } };

const roleBadge: Record<string, string> = {
  admin: "bg-brand-ink text-white dark:bg-white dark:text-brand-ink",
  driver: "bg-brand-orange/15 text-brand-orange-text",
  corporate_admin: "bg-muted",
  customer: "bg-muted text-muted-foreground",
};

export default async function CustomersAdminPage({ searchParams }: PageProps<"/admin/customers">) {
  await connection();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 60);
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, phone, email, role, created_at, bookings(count)", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ");
    const digits = q.replace(/\D/g, "").replace(/^0/, "");
    query = query.or(
      [`full_name.ilike.%${safe}%`, `email.ilike.%${safe}%`, digits.length >= 3 ? `phone.ilike.%${digits}%` : null].filter(Boolean).join(","),
    );
  }
  const { data: people, count } = await query;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">Everyone with an account. {count ?? 0} {q ? "found" : "in total"}.</p>
      </div>

      <form className="relative max-w-md" role="search">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, phone or email"
          className="h-11 w-full rounded-xl border bg-background pr-3 pl-9 text-base outline-none focus-visible:border-brand-orange focus-visible:ring-3 focus-visible:ring-brand-orange/25 sm:text-sm"
        />
      </form>

      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {(people ?? []).map((p) => {
          const trips = (p.bookings as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
          const name = p.full_name ?? "No name yet";
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{name}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", roleBadge[p.role])}>{p.role.replace("_", " ")}</span>
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {p.phone ? formatGhanaPhone(p.phone) : "No phone"}
                  {p.email ? ` · ${p.email}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {trips > 0 ? (
                  <Link href={`/admin/bookings?q=${encodeURIComponent(p.phone ?? name)}`} className="font-medium text-brand-orange-text hover:underline">
                    {trips} booking{trips === 1 ? "" : "s"}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">No bookings</span>
                )}
                <span className="hidden text-xs text-muted-foreground sm:inline">Joined {new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                <CustomerRole userId={p.id} name={name} role={p.role} />
              </div>
            </li>
          );
        })}
        {!people?.length && <li className="px-4 py-10 text-center text-sm text-muted-foreground">{q ? "No one matches that search." : "No accounts yet."}</li>}
      </ul>
    </div>
  );
}
