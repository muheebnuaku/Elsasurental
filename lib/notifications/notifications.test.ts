import { describe, expect, it } from "vitest";
import { buildMessage, maskPhone, type MessageContext, type NotifyEvent } from "./messages";
import { refundFor } from "@/lib/booking/cancellation";

const ctx: MessageContext = {
  ref: "ELS-7K3QX",
  firstName: "Ama",
  trip: "Outstation trip",
  startAt: "2030-06-01T06:00:00Z",
  pickup: "East Legon",
  total: 3700,
  paid: 1110,
  balance: 2590,
  link: "https://elsasu.com/book/confirmation?ref=ELS-7K3QX",
};

describe("messages", () => {
  const events: NotifyEvent[] = [
    "booking_confirmed", "payment_received", "driver_assigned", "reminder_24h", "reminder_1h",
    "trip_started", "trip_completed", "review_request", "booking_cancelled",
  ];

  it.each(events)("%s has SMS text, a WhatsApp template and an email subject", (e) => {
    const m = buildMessage(e, { ...ctx, amount: 500, driverName: "Kwame", driverPhone: "+233200000002" });
    expect(m.sms).toContain("Ama");
    expect(m.sms.length).toBeLessThan(320); // at most 2 SMS parts
    expect(m.whatsapp.template).toBe(`elsasu_${e}`);
    expect(m.whatsapp.params.every((p) => p.length > 0)).toBe(true);
    expect(m.email.subject.length).toBeGreaterThan(5);
  });

  it("states money plainly", () => {
    const m = buildMessage("booking_confirmed", ctx);
    expect(m.sms).toContain("Paid GHS 1,110");
    expect(m.sms).toContain("Balance GHS 2,590");
  });

  it("masks phone numbers for logs", () => expect(maskPhone("+233241234567")).toBe("+23324•••4567"));
});

describe("refundFor (cancellation policy)", () => {
  const now = new Date("2030-06-01T00:00:00Z");
  const at = (hours: number) => new Date(now.getTime() + hours * 3_600_000);
  it("full refund more than 48h before", () => expect(refundFor(at(72), 1110, now)).toMatchObject({ pct: 100, amount: 1110 }));
  it("50% between 24 and 48h", () => expect(refundFor(at(30), 1110, now)).toMatchObject({ pct: 50, amount: 555 }));
  it("nothing within 24h", () => expect(refundFor(at(10), 1110, now)).toMatchObject({ pct: 0, amount: 0 }));
  it("nothing after the trip started", () => expect(refundFor(at(-1), 1110, now)).toMatchObject({ pct: 0, amount: 0 }));
  it("never refunds more than was paid", () => expect(refundFor(at(72), 0, now).amount).toBe(0));
});
