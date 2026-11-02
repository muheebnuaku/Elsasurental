import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PhoneBookingForm } from "@/components/admin/phone-booking-form";
import { getDestinations } from "@/lib/catalog";

export const metadata: Metadata = { title: "Phone booking · Admin", robots: { index: false } };

export default async function NewPhoneBookingPage() {
  const destinations = await getDestinations();
  return (
    <div className="space-y-4">
      <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> Bookings</Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Phone / WhatsApp booking</h1>
        <p className="text-sm text-muted-foreground">Same prices as the website. The booking attaches to the customer&apos;s account when they sign in with this number.</p>
      </div>
      <PhoneBookingForm destinations={destinations.map((d) => ({ slug: d.slug, name: d.name }))} />
    </div>
  );
}
