import { Suspense } from "react";
import { AreaGate } from "@/components/app/area-gate";
import { AreaSkeleton } from "@/components/app/area-skeleton";

// Signed-in area: who may enter is checked on the server (and RLS protects the data).
export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AreaSkeleton />}>
      <AreaGate allow={["driver", "admin"]} path="/driver" nav={[{ href: "/driver", label: "My trips" }]}>
        {children}
      </AreaGate>
    </Suspense>
  );
}
