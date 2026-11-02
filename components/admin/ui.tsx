"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bookingStatus, type BookingStatus } from "@/lib/booking-status";
import type { AdminResult } from "@/lib/actions/admin-bookings";

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const s = bookingStatus[status];
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", s.className, className)}>{s.label}</span>;
}

/** <form> bound to a Server Action that returns AdminResult; shows a toast with the outcome. */
export function ActionForm({
  action,
  children,
  className,
  onDone,
}: {
  action: (prev: AdminResult | null, fd: FormData) => Promise<AdminResult>;
  children: (pending: boolean) => React.ReactNode;
  className?: string;
  onDone?: (r: AdminResult) => void;
}) {
  // Toast from inside the action wrapper (not an effect) so feedback still shows when a successful
  // save removes this form from the page (e.g. paying the last balance hides the payment form).
  const [, formAction, pending] = useActionState(async (prev: AdminResult | null, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
    onDone?.(result);
    return result;
  }, null);
  return (
    <form action={formAction} className={className}>
      {children(pending)}
    </form>
  );
}

export function SubmitButton({ pending, children, variant = "accent", className }: { pending: boolean; children: React.ReactNode; variant?: "accent" | "outline" | "destructive" | "default"; className?: string }) {
  return (
    <Button type="submit" variant={variant} size="lg" disabled={pending} className={cn("h-9 rounded-lg px-3.5", className)}>
      {pending && <Loader2 className="animate-spin" />} {children}
    </Button>
  );
}

export function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export const fieldCls = "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
