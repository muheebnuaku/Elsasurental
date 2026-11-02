import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for pages inside the signed-in areas. */
export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}
