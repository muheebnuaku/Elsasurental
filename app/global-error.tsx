"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";

// Last resort when the root layout itself fails. Replaces <html>, so no providers or fonts here.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-GH">
      <body className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center font-sans text-foreground">
        <p className="text-sm font-medium text-brand-orange-text">Elsasu Rentals</p>
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">Your bookings and payments are safe. Please try again in a moment.</p>
        <button onClick={() => retry()} className="mt-2 h-10 rounded-full bg-brand-orange px-5 text-sm font-semibold text-brand-ink">
          Try again
        </button>
      </body>
    </html>
  );
}
