import * as Sentry from "@sentry/nextjs";

type Extra = Record<string, string | number | boolean | null | undefined>;

/**
 * Log + send to Sentry (a no-op when Sentry isn't configured). Use for errors we catch and recover from,
 * so they still show up on the dashboard. `extra` must never hold phone numbers, emails, card or MoMo details —
 * booking refs and payment references only.
 */
export function reportError(where: string, err: unknown, extra?: Extra) {
  console.error(`[${where}]`, err instanceof Error ? err.message : err, extra ?? "");
  Sentry.withScope((scope) => {
    scope.setTag("where", where);
    if (extra) scope.setExtras(extra);
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
  });
}
