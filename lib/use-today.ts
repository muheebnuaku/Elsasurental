"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Today's date as YYYY-MM-DD (Accra is GMT year-round). Undefined during server render, so no hydration mismatch. */
export function useToday(): string | undefined {
  return useSyncExternalStore(
    noopSubscribe,
    () => new Date().toISOString().slice(0, 10),
    () => undefined,
  );
}
