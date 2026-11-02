"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Clock, Loader2, LocateFixed, Map as MapIcon, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MapPicker } from "@/components/booking/map-picker";
import { cn } from "@/lib/utils";

type Suggestion = { label: string; detail?: string };

/**
 * Address field that does the work for the customer:
 * one-tap popular places, live suggestions, "use my location" (GPS → address) and "pick on map".
 */
export function LocationInput({
  id,
  value,
  onChange,
  placeholder,
  quickPicks = [],
  className,
  inputClassName,
  mapTitle,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  quickPicks?: readonly string[];
  className?: string;
  inputClassName?: string;
  mapTitle?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-list`;
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const [mapOpen, setMapOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  // true while the customer is typing their own search; false after choosing / for quick picks
  const [typing, setTyping] = useState(false);

  // Live suggestions while typing (debounced).
  useEffect(() => {
    const q = value.trim();
    if (!typing || q.length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setSuggestions(data.suggestions ?? []);
        setActive(-1);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value, typing]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function choose(label: string) {
    setTyping(false);
    onChange(label);
    setSuggestions([]);
    setOpen(false);
  }

  function useMyLocation() {
    setGeoError(null);
    if (!navigator.geolocation) return setGeoError("Location isn't available on this device.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          const res = await fetch(`/api/places?lat=${p.coords.latitude}&lng=${p.coords.longitude}`);
          const data = (await res.json()) as { label?: string; error?: string };
          if (data.label) choose(data.label);
          else setGeoError(data.error ?? "Couldn't find your address.");
        } catch {
          setGeoError("Couldn't find your address.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setGeoError(err.code === err.PERMISSION_DENIED ? "Allow location access, or pick on the map." : "Couldn't get your location.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  const showQuick = !typing || value.trim().length < 3;
  const items: Suggestion[] = showQuick ? quickPicks.filter((q) => q !== value).slice(0, 6).map((label) => ({ label })) : suggestions;

  return (
    <div ref={wrap} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={inputId}
          value={value}
          onChange={(e) => {
            setTyping(true);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(items.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(-1, a - 1));
            } else if (e.key === "Enter" && active >= 0 && items[active]) {
              e.preventDefault();
              choose(items[active]!.label);
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className={cn("h-12 rounded-xl pr-10 pl-11 text-base", inputClassName)}
        />
        {(loading || locating) && <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="grid grid-cols-2 border-b">
            <button type="button" onClick={useMyLocation} className="flex items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-muted">
              <LocateFixed className="size-4 text-brand-orange" /> {locating ? "Locating…" : "My location"}
            </button>
            <button type="button" onClick={() => { setOpen(false); setMapOpen(true); }} className="flex items-center gap-2 border-l px-3 py-2.5 text-left text-sm font-medium hover:bg-muted">
              <MapIcon className="size-4 text-brand-orange" /> Pick on map
            </button>
          </div>
          {geoError && <p className="px-3 py-2 text-xs text-destructive">{geoError}</p>}
          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {showQuick && items.length > 0 && <li className="px-3 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Popular</li>}
            {items.map((s, i) => (
              <li key={`${s.label}-${s.detail ?? i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(s.detail && !showQuick ? `${s.label}, ${s.detail}` : s.label)}
                  className={cn("flex w-full items-start gap-2.5 px-3 py-2 text-left text-sm", i === active && "bg-muted")}
                >
                  {showQuick ? <Clock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /> : <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{s.label}</span>
                    {s.detail && <span className="block truncate text-xs text-muted-foreground">{s.detail}</span>}
                  </span>
                </button>
              </li>
            ))}
            {!showQuick && !loading && value.trim().length >= 3 && items.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No matches. Keep the text as typed, or pick on the map.</li>
            )}
          </ul>
        </div>
      )}

      <MapPicker open={mapOpen} onOpenChange={setMapOpen} onPick={choose} title={mapTitle} />
    </div>
  );
}
