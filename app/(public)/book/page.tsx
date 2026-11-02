import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingForm } from "@/components/booking/booking-form";
import { getAddons, getDestinations, getFleet } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Book a van",
  description: "Get an exact price instantly and book a minivan or SUV with a professional driver anywhere in Ghana.",
};

// TODO(Step 7-8): phone OTP + Paystack deposit replace the WhatsApp reservation at the end of this form.
export default async function BookPage() {
  const [fleet, destinations, addons] = await Promise.all([getFleet(), getDestinations(), getAddons()]);

  return (
    <div className="bg-secondary/50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Plan your trip</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Your exact price updates as you go: no forms to send and wait on, no surprises.
        </p>
        <div className="mt-8">
          <Suspense fallback={<FormSkeleton />}>
            <BookingForm
              vanTypes={fleet.map((t) => ({ slug: t.slug, name: t.name, seats: t.seats }))}
              destinations={destinations.map((d) => ({ slug: d.slug, name: d.name, region: d.region }))}
              addons={addons.map((a) => ({ slug: a.slug, name: a.name, price: a.price, unit: a.unit, description: a.description }))}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-40 w-full rounded-3xl" />)}
      </div>
      <Skeleton className="h-80 w-full rounded-3xl" />
    </div>
  );
}
