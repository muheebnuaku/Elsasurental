"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
export type InstallState = { kind: "prompt"; event: InstallEvent } | { kind: "ios" } | null;

/**
 * Whether we can offer "Install the app". Android/desktop Chrome fire `beforeinstallprompt` once per page
 * load, so call this from something that's always mounted. iPhone Safari has no prompt: we show the steps.
 */
export function useInstallApp(): [InstallState, () => void] {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [done, setDone] = useState(false);
  const iosBrowser = useSyncExternalStore(noSubscribe, isIosBrowser, () => false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => setDone(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const state: InstallState = done ? null : event ? { kind: "prompt", event } : iosBrowser ? { kind: "ios" } : null;
  return [state, () => setDone(true)];
}

const noSubscribe = () => () => {};

/** iPhone/iPad, not already opened from the home screen. */
function isIosBrowser() {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  return !standalone && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallAppRow({ state, onDone, className }: { state: InstallState; onDone: () => void; className?: string }) {
  const [steps, setSteps] = useState(false);
  if (!state) return null;

  async function install() {
    if (state?.kind === "ios") return setSteps(true);
    if (state?.kind !== "prompt") return;
    await state.event.prompt();
    const { outcome } = await state.event.userChoice;
    if (outcome === "accepted") onDone();
  }

  return (
    <>
      <button type="button" onClick={install} className={className}>
        <Download /> Install the app
      </button>
      <Dialog open={steps} onOpenChange={setSteps}>
        <DialogContent className="max-w-xs">
          <DialogTitle>Add Elsasu to your home screen</DialogTitle>
          <DialogDescription>Open it like an app, straight from your phone.</DialogDescription>
          <ol className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted"><Share className="size-4" /></span>
              Tap <b>Share</b> at the bottom of Safari
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted"><SquarePlus className="size-4" /></span>
              Choose <b>Add to Home Screen</b>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
