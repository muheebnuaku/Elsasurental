"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// "Move the map under the pin" picker, like ride-hailing apps.
// A tiny dependency-free map over OpenStreetMap tiles. TODO(confirm): switch tiles to a paid provider
// (or Google Maps) for production traffic — OSM's public tiles are for light use only.

type LatLng = { lat: number; lng: number };
const ACCRA: LatLng = { lat: 5.6037, lng: -0.187 };
const TILE = 256;
const MIN_Z = 7;
const MAX_Z = 18;

const project = ({ lat, lng }: LatLng, z: number) => {
  const s = TILE * 2 ** z;
  const r = (lat * Math.PI) / 180;
  return { x: ((lng + 180) / 360) * s, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * s };
};
const unproject = (x: number, y: number, z: number): LatLng => {
  const s = TILE * 2 ** z;
  const n = Math.PI - (2 * Math.PI * y) / s;
  return { lng: (x / s) * 360 - 180, lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))) };
};

export function MapPicker({
  open,
  onOpenChange,
  onPick,
  title = "Pick a location",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (label: string) => void;
  title?: string;
}) {
  const [center, setCenter] = useState<LatLng>(ACCRA);
  const [zoom, setZoom] = useState(13);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [label, setLabel] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const ro = useRef<ResizeObserver | null>(null);
  const drag = useRef<{ x: number; y: number; c: { x: number; y: number } } | null>(null);

  // Callback ref: measure the map box whenever it mounts (the dialog mounts it lazily).
  const mapRef = useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    if (!el) return;
    ro.current = new ResizeObserver(([e]) => e && setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.current.observe(el);
  }, []);

  // Address of whatever is under the pin, after the map settles.
  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setResolving(true);
      try {
        const res = await fetch(`/api/places?lat=${center.lat}&lng=${center.lng}`, { signal: ctrl.signal });
        const data = (await res.json()) as { label?: string; error?: string };
        setLabel(data.label ?? data.error ?? null);
      } catch {
        /* aborted or offline */
      } finally {
        setResolving(false);
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [center, open]);

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCenter({ lat: p.coords.latitude, lng: p.coords.longitude });
        setZoom(17);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const c = project(center, zoom);
  const left = c.x - size.w / 2;
  const top = c.y - size.h / 2;
  const n = 2 ** zoom;
  const tiles: { key: string; src: string; x: number; y: number }[] = [];
  if (size.w) {
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + size.w) / TILE); tx++) {
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + size.h) / TILE); ty++) {
        if (ty < 0 || ty >= n) continue;
        const wx = ((tx % n) + n) % n;
        tiles.push({ key: `${zoom}/${tx}/${ty}`, src: `https://tile.openstreetmap.org/${zoom}/${wx}/${ty}.png`, x: tx * TILE - left, y: ty * TILE - top });
      }
    }
  }

  const zoomBy = (d: number) => setZoom((z) => Math.min(MAX_Z, Math.max(MIN_Z, z + d)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex h-[100dvh] max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[min(640px,90vh)] sm:max-w-2xl sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <DialogTitle className="flex-1 text-base">{title}</DialogTitle>
          <Button variant="ghost" size="icon-lg" onClick={() => onOpenChange(false)} aria-label="Close"><X /></Button>
        </div>

        <div
          ref={mapRef}
          className="relative flex-1 touch-none overflow-hidden bg-muted select-none"
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, c: project(center, zoom) };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            setCenter(unproject(d.c.x - (e.clientX - d.x), d.c.y - (e.clientY - d.y), zoom));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={(e) => zoomBy(e.deltaY < 0 ? 1 : -1)}
          onDoubleClick={() => zoomBy(1)}
          role="application"
          aria-label="Map. Drag to move the pin, use the plus and minus buttons to zoom."
        >
          {tiles.map((t) => (
            // eslint-disable-next-line @next/next/no-img-element -- map tiles: tiny, uncropped, must not go through the image optimizer
            <img key={t.key} src={t.src} alt="" draggable={false} className="pointer-events-none absolute size-64 max-w-none" style={{ transform: `translate(${t.x}px, ${t.y}px)` }} />
          ))}

          {/* fixed centre pin */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
            <MapPin className="size-11 fill-brand-orange text-brand-ink drop-shadow-lg" strokeWidth={1.5} />
          </div>
          <div className="pointer-events-none absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full bg-brand-ink/40" />

          <div className="absolute top-3 right-3 flex flex-col overflow-hidden rounded-xl border bg-background shadow-md">
            <button type="button" className="grid size-10 place-items-center hover:bg-muted" onClick={() => zoomBy(1)} aria-label="Zoom in"><Plus className="size-5" /></button>
            <button type="button" className="grid size-10 place-items-center border-t hover:bg-muted" onClick={() => zoomBy(-1)} aria-label="Zoom out"><Minus className="size-5" /></button>
          </div>
          <button type="button" onClick={locate} className="absolute right-3 bottom-3 flex items-center gap-2 rounded-full border bg-background px-3.5 py-2 text-sm font-medium shadow-md hover:bg-muted">
            {locating ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />} My location
          </button>
          <p className="absolute bottom-1 left-2 text-[10px] text-black/60">© OpenStreetMap contributors</p>
        </div>

        <div className="space-y-3 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex min-h-10 items-start gap-2.5">
            <MapPin className="mt-0.5 size-5 shrink-0 text-brand-orange" />
            <p className="text-sm font-medium" aria-live="polite">
              {resolving && !label ? "Finding address…" : label ?? "Drag the map to place the pin"}
            </p>
          </div>
          <Button
            variant="accent"
            size="xl"
            className="w-full"
            disabled={!label || resolving}
            onClick={() => {
              if (label) onPick(label);
              onOpenChange(false);
            }}
          >
            Use this location
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
