import type { Metadata } from "next";
import { connection } from "next/server";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { formatGhanaPhone } from "@/lib/phone";
import { EmptyTrips, TripList } from "@/components/app/trip-list";
import { DeleteAccount, ProfileForm } from "@/components/app/account-forms";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage() {
  await connection(); // personal, per-request page (reads the clock and the session)
  const user = await getSessionUser();
  if (!user) return null; // the layout gate already redirects

  const supabase = await createClient();
  // RLS returns only this customer's bookings.
  const { data: trips } = await supabase
    .from("bookings")
    .select("id, ref_code, trip_type, status, start_at, passengers, pickup, dropoff, total, amount_paid")
    .eq("customer_id", user.id)
    .order("start_at", { ascending: false })
    .limit(50);

  const { upcoming, past } = splitTrips(trips ?? []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hi {user.fullName?.split(" ")[0] ?? "there"} 👋</h1>
          <p className="text-sm text-muted-foreground">Your trips with Elsasu.</p>
        </div>

        <section className="space-y-2.5">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Upcoming</h2>
          {upcoming.length ? (
            <TripList trips={upcoming} linkDetails />
          ) : (
            <EmptyTrips title="No upcoming trips" body="Get an exact price in seconds and book your van." cta={{ href: "/book", label: "Book a van" }} />
          )}
        </section>

        {past.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Past & cancelled</h2>
            <TripList trips={past} linkDetails />
          </section>
        )}
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="mb-3 font-semibold">Your details</h2>
          <ProfileForm fullName={user.fullName ?? ""} email={user.email ?? ""} phone={user.phone ? formatGhanaPhone(user.phone) : ""} />
        </section>
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="font-semibold">Privacy</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">You can delete your account at any time.</p>
          <DeleteAccount />
        </section>
      </aside>
    </div>
  );
}

/** Upcoming (soonest first) vs past/cancelled, relative to the request time. */
function splitTrips<T extends { start_at: string; status: string }>(trips: T[], now = Date.now()) {
  const upcoming = trips
    .filter((t) => new Date(t.start_at).getTime() >= now && !["cancelled", "refunded"].includes(t.status))
    .reverse();
  return { upcoming, past: trips.filter((t) => !upcoming.includes(t)) };
}
