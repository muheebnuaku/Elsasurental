import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/legal";
import { bookingRules, cancellationPolicy, site } from "@/lib/site";
import { formatGhanaPhone } from "@/lib/phone";
import { getBusiness } from "@/lib/business";

export const metadata: Metadata = {
  title: "Terms of service & cancellation policy",
  description: "Plain-English terms for hiring an Elsasu vehicle with a driver: payment, cancellations and refunds, waiting time, conduct and liability.",
};

const r = bookingRules;
const night = `${r.nightStartHour}:00–${String(r.nightEndHour).padStart(2, "0")}:00`;

/** "48 hours or more", "24–48 hours", "less than 24 hours" for each refund tier. */
function tierLabel(i: number) {
  const p = cancellationPolicy[i]!;
  const above = cancellationPolicy[i - 1]?.minHoursBefore;
  if (i === 0) return `${p.minHoursBefore} hours or more before pick-up`;
  if (p.minHoursBefore === 0) return `Less than ${above} hours before pick-up, or a no-show`;
  return `Between ${p.minHoursBefore} and ${above} hours before pick-up`;
}

// TODO(confirm): have a Ghanaian lawyer review these terms before launch, especially sections 11–13.
export default async function TermsPage() {
  const business = await getBusiness();
  const [first, second] = cancellationPolicy;
  return (
    <LegalPage title="Terms of service" updated="3 November 2026">
      <section className="rounded-2xl border bg-muted/40 p-5 text-foreground">
        <h2>The short version</h2>
        <ul>
          <li>Every vehicle comes with a professional Elsasu driver. <b>There is no self-drive.</b></li>
          <li>Prices are in Ghana cedis (GH₵). Your booking is confirmed once your deposit or full payment goes through.</li>
          <li>
            Cancel {first?.minHoursBefore} hours or more before pick-up for a full refund
            {second ? `, ${second.minHoursBefore}–${first?.minHoursBefore} hours for ${second.refundPct}%` : ""}, and less than{" "}
            {second?.minHoursBefore ?? first?.minHoursBefore} hours for no refund.
          </li>
          <li>Plan extra time for traffic. We aren&apos;t responsible for missed flights or events caused by delays outside our control.</li>
          <li>If we cancel, you get all your money back.</li>
        </ul>
      </section>

      <section>
        <h2>1. Who we are and this agreement</h2>
        <p>
          {site.name} (&quot;Elsasu&quot;, &quot;we&quot;) is based in {business.address}. These terms apply to every booking made on our
          website, app, WhatsApp, by phone or in person. The person who makes and pays for the booking (&quot;you&quot;, the
          hirer) accepts these terms for themselves and everyone travelling with them, and is responsible for the group.
          By paying for a booking you confirm you have read and accept these terms and our{" "}
          <Link href="/privacy">privacy policy</Link>.
        </p>
      </section>

      <section>
        <h2>2. Chauffeur-driven only</h2>
        <ul>
          <li>All our vehicles (minivans and SUVs) are hired with an Elsasu driver. Only our driver may drive the vehicle. We do not offer self-drive.</li>
          <li>The driver is in charge of the vehicle and the route. They may refuse any request that is unsafe or against Ghanaian law, including speeding, overloading, or carrying more people than there are seat belts.</li>
          <li>The driver may stop or end a trip if a passenger&apos;s behaviour puts anyone at risk. In that case no refund is due.</li>
          <li>Drivers work within safe hours. Long trips may include rest breaks, and multi-day trips include reasonable rest overnight.</li>
        </ul>
      </section>

      <section>
        <h2>3. Booking, quotes and prices</h2>
        <ul>
          <li>Quotes are valid for {r.quoteTtlMinutes} minutes and are based on the trip type, route, date, time and number of passengers you give us. Please make sure these are correct, including flight numbers for airport pick-ups.</li>
          <li>Prices are in Ghana cedis (GH₵) and include the vehicle, the driver and fuel for the quoted trip.</li>
          <li>Each trip type includes a set distance and time. Extra kilometres, extra hours, added stops or route changes on the day are charged at the rates shown in your quote.</li>
          <li>Trips between {night} (Accra time) may carry a night surcharge, shown in your quote.</li>
          <li>{/* TODO(confirm): are tolls and parking included? */}Road tolls and parking fees are included unless your quote says otherwise.</li>
          <li>A booking is only confirmed when payment succeeds and you receive a confirmation with a booking reference (for example ELS-ABC12).</li>
        </ul>
      </section>

      <section>
        <h2>4. Payment, cards from abroad and currency</h2>
        <ul>
          <li>You can pay a {r.depositPct}% deposit to confirm, or the full amount. Payments are processed securely by Paystack by Mobile Money or card. We never see or store your card number or MoMo PIN, and we will never ask for them by phone, WhatsApp or chat.</li>
          <li>Any balance must be paid before the trip starts. If it isn&apos;t, we may treat the booking as cancelled by you (section 5).</li>
          <li>
            Cards are charged in Ghana cedis. If your card is in another currency, your bank sets the exchange rate and may
            add fees. Refunds are made in the same cedi amount, so the amount that reaches your account may differ
            slightly because of exchange rates. We cannot cover those differences or bank fees.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. If you cancel</h2>
        <p>Cancel from your booking page (&quot;My trips&quot;) or by contacting us. Times are measured to the booked pick-up time, Accra time (GMT).</p>
        <div className="mt-3 overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">When you cancel</th>
                <th className="px-4 py-2.5 font-semibold">Refund of what you paid</th>
              </tr>
            </thead>
            <tbody>
              {cancellationPolicy.map((p, i) => (
                <tr key={p.minHoursBefore} className="border-t">
                  <td className="px-4 py-2.5">{tierLabel(i)}</td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{p.refundPct === 0 ? "No refund" : `${p.refundPct}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-3">
          {first && second && (
            <li>
              Example: you paid GH₵1,000 for a trip at 9:00 on Saturday. Cancel by 9:00 on Thursday and you get GH₵1,000
              back; cancel on Friday morning and you get GH₵{(1000 * second.refundPct) / 100}; cancel on Friday evening or
              later and no refund is due.
            </li>
          )}
          <li>Refunds go back to the card or Mobile Money wallet you paid with, usually within 5–10 working days, depending on your bank or network.</li>
          <li>Changing the date or time is free if you ask at least {second?.minHoursBefore ?? 24} hours before pick-up and a vehicle is available. If the new trip costs more, you pay the difference. A change can&apos;t be used to avoid the cancellation rules.</li>
          <li>Reducing the number of vehicles in a multi-vehicle booking counts as cancelling those vehicles.</li>
        </ul>
      </section>

      <section>
        <h2>6. If we cancel or can&apos;t provide your vehicle</h2>
        <ul>
          <li>If a vehicle breaks down or becomes unavailable, we will try to send a replacement of the same or a better class at no extra cost.</li>
          <li>If we cancel and can&apos;t offer a replacement you accept, we refund everything you paid for that booking in full.</li>
          <li>Our responsibility in that case is limited to that full refund (see section 11).</li>
        </ul>
      </section>

      <section>
        <h2>7. Waiting time and no-shows</h2>
        <ul>
          <li>For airport pick-ups we track your flight. The driver waits up to {r.airportFreeWaitMinutes} minutes after your flight actually lands, free of charge.</li>
          <li>For other pick-ups the driver waits {r.freeWaitMinutes} minutes after the booked time, free of charge.</li>
          <li>After that, waiting is charged at the extra-hour rate in your quote, in started half-hours.</li>
          <li>If we can&apos;t reach you and nobody arrives within {r.noShowMinutes} minutes after the free waiting time, the trip counts as a no-show and no refund is due.</li>
        </ul>
      </section>

      <section>
        <h2>8. Passengers, luggage and conduct</h2>
        <ul>
          <li>Passengers may not exceed the number of seats. Everyone must wear a seat belt where fitted, as required by Ghanaian law.</li>
          <li>Children must travel with an adult. You are responsible for bringing or booking a suitable child seat (available as an extra).</li>
          <li>No smoking or vaping, no illegal drugs, no weapons and no dangerous goods in the vehicle. Alcohol may only be drunk in the vehicle with our prior agreement (for example at weddings).</li>
          <li>Luggage must fit safely in the vehicle. Tell us in advance about large or unusual items.</li>
          <li>Please carry a valid ID or passport. Police checkpoints are common in Ghana and may ask passengers for identification.</li>
          <li>Treat our drivers with respect. Abuse, threats or harassment end the trip without a refund.</li>
        </ul>
      </section>

      <section>
        <h2>9. Damage, cleaning and lost property</h2>
        <ul>
          <li>The hirer is responsible for damage to the vehicle caused by passengers, beyond normal wear and tear, and for cleaning costs if the vehicle is left excessively dirty (for example vomit, spilled drinks or food waste). We will show you photos and the actual cost before charging.</li>
          <li>Please take all belongings with you. We are not responsible for items left in the vehicle, but we will keep anything found for {r.lostPropertyDays} days and help you get it back. Delivery costs are yours.</li>
        </ul>
      </section>

      <section>
        <h2>10. Delays and events outside our control</h2>
        <p>
          We plan for Accra traffic and aim to arrive early. We are not responsible for delays or cancellations caused by
          events outside our reasonable control, such as heavy traffic, road closures, accidents, police checkpoints,
          severe weather, flooding, fuel shortages, strikes, public disorder, government action or flight delays.
          <b> Please allow extra time for flights, weddings, funerals and other fixed events.</b> We are not liable for missed
          flights, connections, events or any costs that follow from a delay outside our control.
        </p>
      </section>

      <section>
        <h2>11. Our responsibility to you</h2>
        <ul>
          <li>{/* TODO(confirm): insurance type and insurer */}Our vehicles carry the insurance required by Ghanaian law for commercial passenger transport, and our drivers are licensed.</li>
          <li>Apart from what that insurance covers, our total liability for any booking is limited to the amount you paid for that booking.</li>
          <li>We are not liable for indirect or consequential losses, such as lost earnings, missed business or travel costs you booked separately.</li>
          <li>Nothing in these terms limits our liability where the law does not allow it, including for death or personal injury caused by our negligence, and nothing affects your rights as a consumer under Ghanaian law.</li>
        </ul>
      </section>

      <section>
        <h2>12. Complaints and disputes</h2>
        <ul>
          <li>If something goes wrong, tell the driver straight away so we can try to fix it on the spot.</li>
          <li>Otherwise, contact us within {r.complaintDays} days of the trip with your booking reference. We reply within 5 working days and will try to resolve the matter fairly.</li>
          <li>If you paid by card, please contact us before raising a chargeback with your bank. Most issues are solved faster that way.</li>
          <li>These terms are governed by the laws of the Republic of Ghana. If a dispute can&apos;t be settled between us, it will be handled by the courts of Ghana in Accra.</li>
        </ul>
      </section>

      <section>
        <h2>13. Changes to these terms</h2>
        <p>
          We may update these terms. The version shown when you paid for a booking applies to that booking. If any part
          of these terms can&apos;t be enforced, the rest still applies.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>
          <a href={`mailto:${business.email}`}>{business.email}</a> · {formatGhanaPhone(business.phone)} (calls) · WhatsApp {formatGhanaPhone(business.whatsapp)}.
        </p>
      </section>
    </LegalPage>
  );
}
