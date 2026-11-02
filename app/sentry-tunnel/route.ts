// Forwards browser error reports to Sentry without the visitor's cookies or headers (see tunnelRoute in next.config.ts).
export { POST } from "@sentry/nextjs/tunnel";
