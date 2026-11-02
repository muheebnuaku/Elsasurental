import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy" };

// TODO(confirm): register with the Data Protection Commission and have this reviewed before launch.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="1 November 2026">
      <section>
        <p>
          {site.name} respects your privacy and handles personal data in line with Ghana&apos;s Data Protection
          Act, 2012 (Act 843). This policy explains what we collect, why, and your rights.
        </p>
      </section>
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Your name, phone number and (optionally) email address.</li>
          <li>Trip details: pick-up, stops, drop-off, dates and passenger numbers.</li>
          <li>Payment records from Paystack. We never see or store your card number or MoMo PIN.</li>
          <li>Messages you send us on WhatsApp or our website chat.</li>
          <li>During a trip, the van&apos;s location (not yours) so you and your group can track it.</li>
        </ul>
      </section>
      <section>
        <h2>Why we use it</h2>
        <ul>
          <li>To quote, book and run your trip, and to send confirmations and reminders.</li>
          <li>To process payments and refunds.</li>
          <li>To improve our service. We use anonymised analytics only.</li>
        </ul>
        <p className="mt-3">We do not sell your data. We share it only with providers who help us run the service (payments, messaging, hosting) and with your assigned driver.</p>
      </section>
      <section>
        <h2>How long we keep it</h2>
        <p>Booking and payment records are kept for 6 years for tax purposes. Chat transcripts are kept for 12 months.</p>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>
          You can ask to see, correct or delete your personal data at any time, and you can delete your account
          from your account page. Contact <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
