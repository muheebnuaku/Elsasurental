import { Suspense } from "react";
import { AreaGate } from "@/components/app/area-gate";
import { AreaSkeleton } from "@/components/app/area-skeleton";

// Signed-in area: who may enter is checked on the server (and RLS protects the data).
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AreaSkeleton />}>
      <AreaGate allow={["customer", "corporate_admin", "admin", "driver"]} path="/account" nav={[{ href: "/account", label: "My trips" }, { href: "/book", label: "Book a van" }]}>
        {children}
      </AreaGate>
    </Suspense>
  );
}
