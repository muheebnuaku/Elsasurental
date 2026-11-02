"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/format";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <p className="text-sm font-medium text-brand-orange-text">Something went wrong</p>
      <h1 className="text-2xl font-semibold tracking-tight">This page didn&apos;t load properly</h1>
      <p className="text-sm text-muted-foreground">
        Your bookings and payments are safe. Try again, or message us on WhatsApp and we&apos;ll sort it out.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button variant="accent" onClick={() => retry()}><RotateCcw /> Try again</Button>
        <Button variant="outline" asChild><Link href="/">Home</Link></Button>
        <Button variant="outline" asChild><a href={whatsappLink("Hi Elsasu, a page on your website didn't load for me.")} target="_blank" rel="noreferrer">WhatsApp us</a></Button>
      </div>
      {digest && <p className="mt-2 font-mono text-[11px] text-muted-foreground">Error code {digest}</p>}
    </main>
  );
}
