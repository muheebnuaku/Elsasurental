import type { Database } from "@/types/supabase";

export type BookingStatus = Database["public"]["Enums"]["booking_status"];

export const bookingStatus: Record<BookingStatus, { label: string; className: string }> = {
  pending_payment: { label: "Awaiting payment", className: "bg-warning/15 text-foreground" },
  confirmed: { label: "Confirmed", className: "bg-success/15 text-success" },
  assigned: { label: "Driver assigned", className: "bg-success/15 text-success" },
  in_progress: { label: "On the way", className: "bg-brand-orange/15 text-brand-orange-text" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" },
  refunded: { label: "Refunded", className: "bg-muted text-muted-foreground" },
};
