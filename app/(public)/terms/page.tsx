import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal";
import { bookingRules, cancellationPolicy, site } from "@/lib/site";
import { formatGhanaPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Terms of service" };

// TODO(confirm): have a Ghanaian lawyer review these terms before launch.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="1 November 2026">
      <section>
        <h2>1. Our service</h2>
        <p>
          {site.name} provides minivans with a professional driver for hire in Ghana. Vans are not available for
          self-drive. The driver remains in charge of the vehicle and may refuse unsafe or unlawful requests.
        </p>
      </section>
      <section>
        <h2>2. Quotes and prices</h2>
        <ul>
          <li>Quotes are valid for {bookingRules.quoteTtlMinutes} minutes and are based on the route, time and passengers you enter.</li>
          <li>Each trip type includes a set distance and time. Extra kilometres or hours are charged at the rates shown in your quote.</li>
          <li>Trips between 10pm and 5am may carry a night surcharge, shown in your quote.</li>
          <li>Road tolls and parking fees are included unless stated otherwise.</li>
        </ul>
      </section>
      <section>
        <h2>3. Payment</h2>
        <p>
          A booking is confirmed once a deposit of {bookingRules.depositPct}% (or the full amount) is paid through
          Paystack by Mobile Money or card. Any balance is due before the trip starts. We never ask for your PIN or
          card details by phone, WhatsApp or chat.
        </p>
      </section>
      <section>
        <h2>4. Cancellations and refunds</h2>
        <ul>
          {cancellationPolicy.map((p, i) => (
            <li key={i}>
              {p.minHoursBefore > 0
                ? `Cancelled ${p.minHoursBefore}+ hours before pick-up: ${p.refundPct}% refund.`
                : `Cancelled less than ${cancellationPolicy[i - 1]?.minHoursBefore ?? 24} hours before pick-up: no refund.`}
            </li>
          ))}
          <li>Refunds are paid back to the original payment method within 5–10 working days.</li>
          <li>Date or time changes are free, subject to availability.</li>
        </ul>
      </section>
      <section>
        <h2>5. Passengers and conduct</h2>
        <p>
          Passenger numbers must not exceed the seats in the van. Smoking and illegal substances are not allowed.
          The hirer is responsible for damage caused by passengers beyond normal wear.
        </p>
      </section>
      <section>
        <h2>6. Delays</h2>
        <p>
          We plan for traffic and aim to arrive early. We are not liable for delays caused by events outside our
          control, such as road closures, accidents or severe weather.
        </p>
      </section>
      <section>
        <h2>7. Contact</h2>
        <p>
          Questions about these terms: <a href={`mailto:${site.email}`}>{site.email}</a> or {formatGhanaPhone(site.phone)}.
        </p>
      </section>
    </LegalPage>
  );
}
