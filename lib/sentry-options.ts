import type * as Sentry from "@sentry/nextjs";

type DataCollection = NonNullable<NonNullable<Parameters<typeof Sentry.init>[0]>["dataCollection"]>;

/**
 * Shared by server and browser Sentry. Sentry's defaults collect request bodies, cookies, headers and AI chat
 * text — here that would mean names, phone numbers and session cookies, so all of it is off. Errors still
 * arrive with stack traces, the route and the booking/payment ref we attach in reportError().
 */
export const sentryDataCollection: DataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: { deny: ["phone", "email", "token", "t", "code"] },
  genAI: { inputs: false, outputs: false },
};
