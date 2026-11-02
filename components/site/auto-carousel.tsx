"use client";

import { Children, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal, swipeable row that advances one card at a time and loops.
 * Pauses while hovered/touched or when the tab is hidden; no autoplay for reduced-motion users.
 * `itemClassName` sets card width per breakpoint, e.g. "basis-[85%] sm:basis-1/2 lg:basis-1/4".
 * `desktopGrid` turns autoplay off at lg+ and shows a static grid instead (pass grid classes).
 */
export function AutoCarousel({
  children,
  itemClassName,
  intervalMs = 3500,
  desktopGrid,
  className,
  label,
}: {
  children: React.ReactNode;
  itemClassName: string;
  intervalMs?: number;
  desktopGrid?: string;
  className?: string;
  label: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const items = Children.toArray(children);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = desktopGrid ? window.matchMedia("(min-width: 1024px)") : null;

    const step = () => {
      if (reduce || paused.current || document.hidden || desktop?.matches) return;
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) return;
      const gap = parseFloat(getComputedStyle(el).columnGap || "0");
      const width = card.offsetWidth + gap;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + width, behavior: "smooth" });
    };
    const id = window.setInterval(step, intervalMs);

    const onScroll = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (card) setActive(Math.round(el.scrollLeft / (card.offsetWidth + parseFloat(getComputedStyle(el).columnGap || "0"))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearInterval(id);
      el.removeEventListener("scroll", onScroll);
    };
  }, [intervalMs, desktopGrid]);

  return (
    <div className={cn("min-w-0", className)} role="region" aria-roledescription="carousel" aria-label={label}>
      <div
        ref={track}
        onPointerEnter={() => {
          paused.current = true;
        }}
        onPointerLeave={() => {
          paused.current = false;
        }}
        onTouchStart={() => {
          paused.current = true;
        }}
        onTouchEnd={() => {
          setTimeout(() => (paused.current = false), 4000);
        }}
        onFocus={() => {
          paused.current = true;
        }}
        onBlur={() => {
          paused.current = false;
        }}
        className={cn(
          "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 sm:-mx-6 sm:scroll-px-6 sm:px-6",
          desktopGrid && `lg:mx-0 lg:grid lg:snap-none lg:overflow-visible lg:px-0 ${desktopGrid}`,
        )}
      >
        {items.map((child, i) => (
          <div key={i} className={cn("shrink-0 snap-start", itemClassName, desktopGrid && "lg:basis-auto")}>
            {child}
          </div>
        ))}
      </div>
      <div className={cn("mt-3 flex justify-center gap-1.5", desktopGrid && "lg:hidden")} aria-hidden>
        {items.map((_, i) => (
          <span key={i} className={cn("h-1.5 rounded-full transition-all", i === active ? "w-5 bg-brand-orange" : "w-1.5 bg-foreground/20")} />
        ))}
      </div>
    </div>
  );
}
