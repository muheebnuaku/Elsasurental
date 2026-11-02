import { Suspense } from "react";
import { AreaGate } from "@/components/app/area-gate";
import { AreaSkeleton } from "@/components/app/area-skeleton";

// Signed-in area: who may enter is checked on the server (and RLS protects the data).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AreaSkeleton />}>
      <AreaGate allow={["admin"]} path="/admin" nav={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/bookings", label: "Bookings" },
          { href: "/admin/calendar", label: "Calendar" },
          { href: "/admin/fleet", label: "Fleet" },
          { href: "/admin/pricing", label: "Pricing" },
        ]}>
        {children}
      </AreaGate>
    </Suspense>
  );
}
