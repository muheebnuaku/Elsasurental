import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import { sentryDataCollection } from "@/lib/sentry-options";

// Browser error tracking + product analytics. Each is off until its key is set.
// Both go through our own domain (/monitoring, /ingest) so ad blockers don't drop them.

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    dataCollection: sentryDataCollection,
  });
}

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
if (posthogKey) {
  try {
    posthog.init(posthogKey, {
      api_host: "/ingest",
      ui_host: (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com").replace(".i.posthog.com", ".posthog.com"),
      defaults: "2025-05-24",
      capture_pageview: "history_change",
      person_profiles: "identified_only",
      // Booking forms hold names and phone numbers: never record screens or read text from the page.
      disable_session_recording: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
    });
  } catch {
    // analytics must never break the site
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
