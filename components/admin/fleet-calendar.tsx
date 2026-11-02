"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { moveBookingToVan } from "@/lib/actions/admin-bookings";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/lib/booking-status";

export type CalVan = { id: string; name: string; plate: string; typeId: string; status: string };
export type CalBooking = { id: string; ref: string; vehicleId: string | null; typeId: string; start: string; end: string; status: BookingStatus; label: string; noDriver: boolean };

const barColor: Record<string, string> = {
  pending_payment: "bg-warning/80 text-foreground",
  confirmed: "bg-success/85 text-white",
  assigned: "bg-brand-ink text-white dark:bg-white dark:text-brand-ink",
  in_progress: "bg-brand-orange text-brand-ink",
  completed: "bg-muted-foreground/40 text-foreground",
};
const LOCKED: BookingStatus[] = ["in_progress", "completed"];

/** Vans × days. Drag a bar onto another van (same size) to reassign; the database refuses clashes. */
export function FleetCalendar({ vans, bookings, rangeStart, days }: { vans: CalVan[]; bookings: CalBooking[]; rangeStart: string; days: number }) {
  const router = useRouter();
  const [items, setItems] = useState(bookings);
  const [dragging, setDragging] = useState<CalBooking | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [, start] = useTransition();

  const t0 = new Date(`${rangeStart}T00:00:00Z`).getTime();
  const span = days * 86_400_000;
  const pos = (b: CalBooking) => {
    const a = Math.max(0, new Date(b.start).getTime() - t0);
    const z = Math.min(span, new Date(b.end).getTime() - t0);
    return { left: `${(a / span) * 100}%`, width: `${Math.max(((z - a) / span) * 100, 7)}%` };
  };
  const dayLabels = Array.from({ length: days }, (_, i) => {
    const d = new Date(t0 + i * 86_400_000);
    return { key: i, label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" }), weekend: [0, 6].includes(d.getUTCDay()) };
  });

  function drop(van: CalVan) {
    const b = dragging;
    setDragging(null);
    setOver(null);
    if (!b || b.vehicleId === van.id) return;
    if (b.typeId !== van.typeId) return toast.error("Move it to a van of the same size.");
    const before = items;
    setItems((xs) => xs.map((x) => (x.id === b.id ? { ...x, vehicleId: van.id } : x))); // optimistic
    start(async () => {
      const r = await moveBookingToVan(b.id, van.id);
      if (r.ok) {
        toast.success(`${b.ref} moved to ${van.name}`);
        router.refresh();
      } else {
        setItems(before);
        toast.error(r.message);
      }
    });
  }

  const rows: (CalVan | null)[] = [...vans, null]; // null = unassigned
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[150px_1fr] border-b text-xs font-medium text-muted-foreground">
          <div className="px-3 py-2">Van</div>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>
            {dayLabels.map((d) => <div key={d.key} className={cn("border-l px-2 py-2", d.weekend && "bg-muted/50")}>{d.label}</div>)}
          </div>
        </div>
        {rows.map((van) => {
          const rowItems = items.filter((b) => (van ? b.vehicleId === van.id : !b.vehicleId));
          if (!van && rowItems.length === 0) return null;
          const canDrop = van && dragging && dragging.typeId === van.typeId && van.status !== "maintenance";
          return (
            <div key={van?.id ?? "unassigned"} className="grid grid-cols-[150px_1fr] border-b last:border-b-0">
              <div className="px-3 py-2.5 text-sm">
                {van ? (
                  <>
                    <p className="font-medium">{van.name}</p>
                    <p className="text-xs text-muted-foreground">{van.plate}{van.status === "maintenance" ? " · maintenance" : ""}</p>
                  </>
                ) : <p className="font-medium text-destructive">No van yet</p>}
              </div>
              <div
                onDragOver={(e) => { if (canDrop) { e.preventDefault(); setOver(van!.id); } }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => { e.preventDefault(); if (van) drop(van); }}
                className={cn("relative min-h-14", van?.status === "maintenance" && "bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,var(--muted)_6px,var(--muted)_12px)]", over === van?.id && "bg-brand-orange/10")}
              >
                <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>
                  {dayLabels.map((d) => <div key={d.key} className={cn("border-l", d.weekend && "bg-muted/30")} />)}
                </div>
                {rowItems.map((b) => (
                  <Link
                    key={b.id}
                    href={`/admin/bookings/${b.ref}`}
                    draggable={!LOCKED.includes(b.status)}
                    onDragStart={(e) => { setDragging(b); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={() => { setDragging(null); setOver(null); }}
                    title={`${b.ref} · ${b.label}`}
                    style={pos(b)}
                    className={cn(
                      "absolute top-2 bottom-2 flex items-center overflow-hidden rounded-md px-1.5 text-[11px] leading-tight font-medium shadow-sm",
                      barColor[b.status] ?? "bg-muted",
                      !LOCKED.includes(b.status) && "cursor-grab active:cursor-grabbing",
                      b.noDriver && "ring-2 ring-destructive ring-inset",
                    )}
                  >
                    <span className="truncate">{b.ref} · {b.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
