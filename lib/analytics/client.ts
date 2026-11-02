import posthog from "posthog-js";

// Booking-funnel events. Properties are trip facts only (trip type, vans, amounts, refs) — never names,
// phone numbers, emails or payment details.
export type FunnelEvent =
  | "quote_shown"
  | "ai_trip_filled"
  | "checkout_started"
  | "payment_redirected"
  | "balance_payment_started"
  | "booking_cancelled_by_customer"
  | "chat_opened";

type Props = Record<string, string | number | boolean | null | undefined>;

/** No-op until PostHog is initialised (no key, or blocked). */
export function track(event: FunnelEvent, props?: Props) {
  if (posthog.__loaded) posthog.capture(event, props);
}

/** Link this browser's events to the signed-in account (by id only, no personal details). */
export function identify(userId: string) {
  if (posthog.__loaded) posthog.identify(userId);
}

export function resetIdentity() {
  if (posthog.__loaded) posthog.reset();
}
