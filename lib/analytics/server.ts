import { PostHog } from "posthog-node";

export type ServerEvent = "payment_succeeded" | "booking_cancelled";

/**
 * Server-confirmed funnel steps (payments only count once Paystack says so). Call inside `after()`.
 * distinctId is the customer's account id when there is one, so it joins the browser funnel.
 */
export async function trackServer(event: ServerEvent, distinctId: string, props: Record<string, string | number | null>) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const ph = new PostHog(key, { host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com", flushAt: 1, flushInterval: 0 });
  try {
    ph.capture({ distinctId, event, properties: props });
  } finally {
    await ph.shutdown();
  }
}
