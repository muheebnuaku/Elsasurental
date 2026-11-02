import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero, Section } from "@/components/site/section";
import { FleetCard } from "@/components/fleet/fleet-card";
import { getFleet } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "Our fleet — 8 & 14-seater minivans",
  description: "Air-conditioned 8- and 14-seater minivans with professional drivers. Compare and pick the right van for your group.",
};

export default async function FleetPage() {
  const fleet = await getFleet();

  return (
    <>
      <PageHero eyebrow="Our fleet" title="The right van for every group" intro="Tap a van for photos, what's included and prices by trip." />
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          {fleet.map((t, i) => (
            <FleetCard key={t.id} type={t} priority={i === 0} />
          ))}
        </div>

        {fleet.length > 1 && (
          <div className="mt-6 overflow-hidden rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <caption className="sr-only">Compare vans</caption>
              <thead className="bg-secondary/70 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Van</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Seats</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-semibold sm:table-cell">Bags</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">From</th>
                  <th scope="col" className="px-4 py-2.5"><span className="sr-only">Details</span></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fleet.map((t) => (
                  <tr key={t.id}>
                    <th scope="row" className="px-4 py-3 text-left font-semibold">{t.name}</th>
                    <td className="px-4 py-3 tabular-nums">{t.seats}</td>
                    <td className="hidden px-4 py-3 tabular-nums sm:table-cell">{t.luggage_capacity}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{t.fromPrice !== null ? formatMoney(t.fromPrice) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/fleet/${t.slug}`} className="inline-flex items-center gap-1 font-semibold text-brand-orange-text hover:underline">
                        View <ArrowRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
