"use client";

import { motion, useReducedMotion, type Transition } from "framer-motion";
import { Flag, MapPin, Smartphone, Users } from "lucide-react";
import { VanBody, vanLength } from "@/components/fleet/van-art";
import { cn } from "@/lib/utils";

// A rental in one loop: the van arrives at the pick-up pin, the group boards, it drives to the
// destination and STOPS at the flag, the group steps out, then the scene resets.
// Pure SVG + Framer Motion; a still frame when the visitor prefers reduced motion.

const DURATION = 14; // seconds per loop
const SEATS = 14;
const SCALE = 0.4;
const VAN_W = vanLength(SEATS) * SCALE;
const ROAD_Y = 196;
const CURB_Y = ROAD_Y + 48; // near-side pavement, in front of the van
const VAN_Y = ROAD_Y - 158 * SCALE - 1;
const PICKUP_X = 168;
const DEST_X = 560;
const DOOR = 0.36; // sliding door position along the van

const START_X = -VAN_W - 30;
const AT_PICKUP = PICKUP_X - VAN_W * DOOR;
const AT_DEST = DEST_X - VAN_W - 16; // front bumper stops just before the flag

// Timeline (fractions of the loop)
const T = {
  arrive: 0.18, // stopped at pick-up
  boardStart: 0.2,
  boardEnd: 0.3,
  depart: 0.42,
  reach: 0.66, // stopped at destination
  alightStart: 0.69,
  alightEnd: 0.8,
  fade: 0.92,
};

const people = [
  { dx: 18, color: "var(--brand-orange)", h: 1 },
  { dx: 30, color: "#fafafa", h: 0.88 },
  { dx: 41, color: "#f59e0b", h: 0.72 },
  { dx: 52, color: "#d4d4d4", h: 1.04 },
  { dx: 64, color: "#fb923c", h: 0.94 },
];

const steps = [
  { icon: Smartphone, text: "Book in 60 seconds", from: 0, to: T.arrive },
  { icon: Users, text: "Your driver picks everyone up", from: T.arrive, to: T.depart },
  { icon: MapPin, text: "On the road together", from: T.depart, to: T.reach },
  { icon: Flag, text: "Arrived, all of you", from: T.reach, to: 1 },
] as const;

const loop = (times: number[], ease: Transition["ease"] = "easeInOut"): Transition => ({
  duration: DURATION,
  repeat: Infinity,
  times,
  ease,
});

function Person({ color, h }: { color: string; h: number }) {
  return (
    <g transform={`scale(${h})`}>
      <circle cx="0" cy="-29" r="4.6" fill={color} />
      <rect x="-5" y="-23" width="10" height="15" rx="4.5" fill={color} />
      <rect x="-4" y="-9" width="3.2" height="9" rx="1.5" fill={color} opacity="0.85" />
      <rect x="0.8" y="-9" width="3.2" height="9" rx="1.5" fill={color} opacity="0.85" />
    </g>
  );
}

export function HeroJourney({ className }: { className?: string }) {
  const still = useReducedMotion() ?? false;

  // Van: ease into the stop, wait, pull away gently, brake at the flag, wait, fade.
  const vanX = [START_X, AT_PICKUP, AT_PICKUP, AT_DEST, AT_DEST, AT_DEST];
  const vanTimes = [0, T.arrive, T.depart, T.reach, T.fade, 1];
  const vanEase: Transition["ease"] = ["easeOut", "linear", [0.45, 0, 0.25, 1], "linear", "linear"];
  // Wheels turn only while the van moves, in proportion to the distance covered.
  const turns = (dx: number) => (dx / (2 * Math.PI * 23 * SCALE)) * 360;
  const leg1 = turns(AT_PICKUP - START_X);
  const leg2 = turns(AT_DEST - AT_PICKUP);
  const wheelTurns = [0, leg1, leg1, leg1 + leg2, leg1 + leg2, leg1 + leg2];

  return (
    <div className={cn("relative select-none", className)} aria-hidden>
      <svg viewBox="0 0 640 256" className="h-auto w-full overflow-visible">
        <defs>
          <linearGradient id="hj-road" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#2a2a2a" />
            <stop offset="1" stopColor="#121212" />
          </linearGradient>
          <linearGradient id="hj-beam" x1="0" x2="1">
            <stop offset="0" stopColor="#fde68a" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hj-edges" x1="0" x2="1">
            <stop offset="0" stopColor="var(--brand-ink)" />
            <stop offset="0.08" stopColor="var(--brand-ink)" stopOpacity="0" />
            <stop offset="0.92" stopColor="var(--brand-ink)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--brand-ink)" />
          </linearGradient>
          <radialGradient id="hj-sun">
            <stop offset="0" stopColor="var(--brand-orange)" stopOpacity="0.4" />
            <stop offset="1" stopColor="var(--brand-orange)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* sky: warm sun and a distant Accra-style skyline */}
        <circle cx="500" cy="74" r="56" fill="url(#hj-sun)" opacity="0.7" />
        <circle cx="500" cy="74" r="16" fill="var(--brand-orange)" opacity="0.45" />
        <g fill="#fff" opacity="0.08">
          {[[0, 128, 30, 78], [34, 104, 24, 102], [62, 140, 40, 66], [106, 116, 22, 90], [132, 146, 46, 60], [182, 96, 28, 110],
            [214, 132, 34, 74], [252, 110, 22, 96], [278, 142, 50, 64], [332, 122, 26, 84], [362, 100, 32, 106], [398, 136, 42, 70],
            [444, 118, 24, 88], [472, 144, 46, 62], [522, 108, 32, 98], [558, 134, 40, 72], [602, 116, 30, 90], [636, 140, 40, 66]].map(([x, y, w, h]) => (
            <rect key={x} x={x} y={y} width={w} height={h} rx="2" />
          ))}
        </g>

        {/* palms + a streetlight, at road level */}
        {[96, 330].map((x) => (
          <g key={x} stroke="#fff" strokeOpacity="0.18" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d={`M${x},${ROAD_Y} C${x - 2},176 ${x + 4},156 ${x + 2},134`} />
            <path d={`M${x + 2},134 c-14,-6 -24,0 -30,8 M${x + 2},134 c14,-8 26,-2 32,6 M${x + 2},134 c-4,-14 -16,-18 -24,-16 M${x + 2},134 c6,-14 18,-16 26,-12`} />
          </g>
        ))}
        <g stroke="#fff" strokeOpacity="0.2" strokeWidth="2.5" fill="none">
          <path d={`M440,${ROAD_Y} V140 q0,-8 10,-8 h12`} />
        </g>
        <circle cx="464" cy="133" r="3" fill="#fde68a" opacity="0.7" />

        {/* road */}
        <rect x="-20" y={ROAD_Y} width="680" height="42" rx="3" fill="url(#hj-road)" />
        <rect x="-20" y={ROAD_Y} width="680" height="1.5" fill="#fff" opacity="0.14" />
        <rect x="-20" y={ROAD_Y + 42} width="680" height="14" fill="#1f1f1f" />
        <rect x="-20" y={ROAD_Y + 42} width="680" height="2" fill="#fff" opacity="0.1" />
        <line x1="-40" x2="680" y1={ROAD_Y + 22} y2={ROAD_Y + 22} stroke="#fff" strokeOpacity="0.3" strokeWidth="2.5" strokeDasharray="20 16" />

        {/* pick-up pin */}
        <g transform={`translate(${PICKUP_X} ${ROAD_Y - 1})`}>
          <ellipse rx="11" ry="3" fill="var(--brand-orange)" opacity="0.4" />
          <path d="M0,0 C-8,-12 -12,-18 -12,-26 a12,12 0 0 1 24,0 C12,-18 8,-12 0,0 Z" transform="translate(0 -56)" fill="var(--brand-orange)" />
          <circle cy="-82" r="4.6" fill="var(--brand-ink)" />
          <text y="-94" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#fff" fillOpacity="0.75">Pick-up</text>
        </g>

        {/* destination flag */}
        <g transform={`translate(${DEST_X} ${ROAD_Y - 1})`}>
          <ellipse rx="10" ry="3" fill="#fff" opacity="0.18" />
          <path d="M0,0 V-62" stroke="#fafafa" strokeOpacity="0.75" strokeWidth="2.5" />
          <path d="M0,-62 h24 l-6,7 l6,7 h-24 Z" fill="#fafafa" />
          <text x="2" y="-70" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#fff" fillOpacity="0.75">Destination</text>
        </g>

        {/* the van */}
        <motion.g
          initial={false}
          animate={still ? { x: AT_PICKUP, opacity: 1 } : { x: vanX, opacity: [0, 1, 1, 1, 1, 0] }}
          transition={{ ...loop(vanTimes), ease: vanEase }}
        >
          {/* soft ground shadow */}
          <ellipse cx={VAN_W / 2} cy={ROAD_Y + 3} rx={VAN_W / 2 - 4} ry="4" fill="#000" opacity="0.5" />
          {/* headlight beam */}
          <path d={`M${VAN_W - 4},${VAN_Y + 38} L${VAN_W + 70},${VAN_Y + 28} L${VAN_W + 70},${VAN_Y + 60} Z`} fill="url(#hj-beam)" />
          {/* gentle suspension bounce */}
          <motion.g
            animate={still ? undefined : { y: [0, -0.9, 0, -0.5, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <g transform={`translate(0 ${VAN_Y}) scale(${SCALE})`}>
              <VanBody
                seats={SEATS}
                wrapWheel={(cx, wheel) => (
                  <motion.g
                    key={cx}
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                    animate={still ? undefined : { rotate: wheelTurns }}
                    transition={{ ...loop(vanTimes), ease: vanEase }}
                  >
                    {wheel}
                  </motion.g>
                )}
              />
            </g>
          </motion.g>
        </motion.g>

        {/* group waiting on the near curb, stepping up into the van one by one */}
        {people.map((p, i) => {
          const s = T.boardStart + i * 0.014;
          const e = s + 0.035;
          return (
            <motion.g
              key={`a${i}`}
              initial={false}
              animate={
                still
                  ? { x: 0, y: 0, opacity: 1 }
                  : { x: [0, 0, 0, -p.dx, -p.dx, 0], y: [0, 0, 0, -14, -14, 0], opacity: [1, 1, 1, 0, 0, 1] }
              }
              transition={loop([0, T.arrive, s, e, 0.97, 1], "easeInOut")}
            >
              <g transform={`translate(${PICKUP_X + p.dx} ${CURB_Y})`}>
                <Person color={p.color} h={p.h} />
              </g>
            </motion.g>
          );
        })}

        {/* group stepping out at the destination */}
        {people.map((p, i) => {
          const s = T.alightStart + i * 0.02;
          const e = s + 0.05;
          const doorX = AT_DEST + VAN_W * DOOR;
          return (
            <motion.g
              key={`b${i}`}
              initial={false}
              animate={
                still
                  ? { opacity: 0 }
                  : { x: [0, 0, 0, 14 + i * 12, 14 + i * 12, 14 + i * 12], y: [-14, -14, -14, 0, 0, 0], opacity: [0, 0, 1, 1, 1, 0] }
              }
              transition={loop([0, s, s + 0.01, e, T.fade, 0.97], "easeOut")}
            >
              <g transform={`translate(${doorX} ${CURB_Y})`}>
                <Person color={p.color} h={p.h * 0.95} />
              </g>
            </motion.g>
          );
        })}

        {/* speech-bubble moments */}
        <Bubble x={AT_PICKUP + VAN_W * 0.82} y={VAN_Y - 30} text="+5 aboard" times={[0, T.boardEnd - 0.03, T.boardEnd, T.depart, T.depart + 0.03, 1]} still={still} />
        <Bubble x={AT_DEST + VAN_W * 0.5} y={VAN_Y - 32} text="Arrived ✓" times={[0, T.alightEnd - 0.04, T.alightEnd - 0.01, T.fade - 0.02, T.fade, 1]} still={still} />

        <rect x="-20" y="0" width="680" height="256" fill="url(#hj-edges)" pointerEvents="none" />
      </svg>

      {/* captions, one per step */}
      <div className="relative h-8">
        {steps.map(({ icon: Icon, text, from, to }, i) => (
          <motion.p
            key={text}
            className="absolute inset-x-0 flex items-center justify-center gap-2 text-sm font-medium text-white/85 sm:text-[15px]"
            initial={false}
            animate={
              still
                ? { opacity: i === 1 ? 1 : 0 }
                : { opacity: from === 0 ? [1, 1, 1, 1, 0, 0] : [0, 0, 1, 1, 0, 0], y: [4, 4, 0, 0, -4, -4] }
            }
            transition={still ? undefined : loop([0, from, from + 0.03, to - 0.03, to, 1], "easeOut")}
          >
            <span className="grid size-6 place-items-center rounded-full bg-brand-orange text-brand-ink">
              <Icon className="size-3.5" />
            </span>
            {text}
          </motion.p>
        ))}
      </div>
      <div className="mt-1.5 flex justify-center gap-1.5">
        {steps.map(({ text, from, to }) => (
          <span key={text} className="relative h-1 w-8 overflow-hidden rounded-full bg-white/15 sm:w-10">
            {!still && (
              <motion.span
                className="absolute inset-y-0 left-0 rounded-full bg-brand-orange"
                animate={{ width: ["0%", "0%", "100%", "100%"] }}
                transition={loop([0, from, to, 1], "linear")}
              />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function Bubble({ x, y, text, times, still }: { x: number; y: number; text: string; times: number[]; still: boolean }) {
  return (
    <motion.g
      initial={false}
      animate={still ? { opacity: 0 } : { opacity: [0, 0, 1, 1, 0, 0], y: [6, 6, 0, 0, -4, -4] }}
      transition={still ? undefined : loop(times, "easeOut")}
    >
      <rect x={x - 38} y={y} width="76" height="23" rx="11.5" fill="var(--brand-orange)" />
      <path d={`M${x - 5},${y + 22} l5,6 l5,-6 Z`} fill="var(--brand-orange)" />
      <text x={x} y={y + 15.5} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--brand-ink)">{text}</text>
    </motion.g>
  );
}
