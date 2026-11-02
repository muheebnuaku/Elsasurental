import { useId } from "react";
import { cn } from "@/lib/utils";

/** Body length of the drawing in SVG units (height is always 168). */
export const vanLength = (seats: number) => (seats > 8 ? 430 : 360);

// Side-view minivan illustration (used on the 404 page and in the landing animation).
export function VanArt({ seats, className }: { seats: number; className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${vanLength(seats) + 6} 168`}
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label={`${seats}-seater minivan illustration`}
    >
      <VanBody seats={seats} />
    </svg>
  );
}

/**
 * The van as an SVG group, for placing inside a larger scene.
 * `wrapWheel` lets callers animate each wheel (e.g. spin it).
 */
export function VanBody({
  seats,
  wrapWheel = (_cx, wheel) => wheel,
}: {
  seats: number;
  wrapWheel?: (cx: number, wheel: React.ReactNode) => React.ReactNode;
}) {
  const id = useId();
  const long = seats > 8;
  const L = vanLength(seats);
  const panes = long ? 4 : 3;
  const winStart = 30;
  const winEnd = L - 124;
  const gap = 7;
  const paneW = (winEnd - winStart - gap * (panes - 1)) / panes;
  const rearWheel = 82;
  const frontWheel = L - 82;
  const doorX = winStart + paneW + gap / 2;

  return (
    <g>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#f1f1f1" />
          <stop offset="1" stopColor="#dedede" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3d3d3d" />
          <stop offset="1" stopColor="var(--brand-ink)" />
        </linearGradient>
      </defs>

      <ellipse cx={L / 2} cy="153" rx={L / 2 - 12} ry="6" fill="var(--brand-ink)" opacity="0.16" />

      {/* body: rounded rear, long roof, raked windscreen, short bonnet */}
      <path
        d={`M34,30 H${L - 118} C${L - 104},30 ${L - 96},34 ${L - 88},42 L${L - 54},76
           C${L - 30},80 ${L - 12},87 ${L - 7},99 V122 C${L - 7},130 ${L - 12},135 ${L - 20},135
           H24 C16,135 12,130 12,122 V50 C12,38 21,30 34,30 Z`}
        fill={`url(#${id}-body)`}
        stroke="var(--brand-ink)"
        strokeOpacity="0.2"
        strokeWidth="1.5"
      />

      {/* windscreen */}
      <path
        d={`M${L - 116},38 H${L - 104} C${L - 99},38 ${L - 95},40 ${L - 91},44 L${L - 62},76 H${L - 116} Z`}
        fill={`url(#${id}-glass)`}
      />

      {/* side windows */}
      {Array.from({ length: panes }, (_, i) => (
        <rect
          key={i}
          x={winStart + i * (paneW + gap)}
          y="38"
          width={paneW}
          height="38"
          rx={i === 0 ? 10 : 5}
          fill={`url(#${id}-glass)`}
        />
      ))}
      <path d={`M${winStart + 10},42 h14 l-12,30 h-8 Z`} fill="#fff" opacity="0.14" />

      {/* sliding door seam + handle */}
      <path d={`M${doorX + paneW + gap},34 V132`} stroke="var(--brand-ink)" strokeOpacity="0.14" strokeWidth="1.5" />
      <path d={`M${doorX},34 V132`} stroke="var(--brand-ink)" strokeOpacity="0.14" strokeWidth="1.5" />
      <rect x={doorX + paneW - 6} y="84" width="16" height="4" rx="2" fill="var(--brand-ink)" opacity="0.35" />

      {/* brand stripe */}
      <path d={`M12,96 H${L - 8} V103 H12 Z`} fill="var(--brand-orange)" />

      {/* lights + mirror */}
      <path d={`M${L - 20},88 h10 a4,4 0 0 1 3,4 v3 h-13 Z`} fill="var(--brand-orange)" />
      <rect x="12" y="106" width="6" height="11" rx="2" fill="#d33" opacity="0.85" />
      <rect x={L - 118} y="62" width="9" height="8" rx="2.5" fill="var(--brand-ink)" opacity="0.7" />

      {/* wheel arches + wheels */}
      {[rearWheel, frontWheel].map((cx) => (
        <g key={cx}>
          <path d={`M${cx - 30},135 a30,30 0 0 1 60,0`} fill="var(--brand-ink)" opacity="0.12" />
          {wrapWheel(
            cx,
            <g>
              <circle cx={cx} cy="135" r="23" fill="#141414" />
              <circle cx={cx} cy="135" r="12" fill="#d4d4d4" />
              <path d={`M${cx - 11},135 H${cx + 11} M${cx},124 V146`} stroke="#8a8a8a" strokeWidth="2.5" />
              <circle cx={cx} cy="135" r="4" fill="#141414" />
            </g>,
          )}
        </g>
      ))}
    </g>
  );
}
