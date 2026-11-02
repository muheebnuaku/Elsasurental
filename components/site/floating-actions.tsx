"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, MessageCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { CHAT_STATE_EVENT, openChat } from "@/components/chat/chat-widget";
import { whatsappLink } from "@/lib/format";
import { useBusiness } from "@/components/business-provider";
import { cn } from "@/lib/utils";

/** Bottom-right stack on every screen: WhatsApp, Ask (assistant), Book. Hidden while the chat is open. */
export function FloatingActions() {
  const business = useBusiness();
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = useState(false);
  const [covering, setCovering] = useState(false);
  const stack = useRef<HTMLDivElement>(null);

  // Never cover a form: fade out while an element marked [data-floating-avoid] is under the buttons.
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = stack.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const points: [number, number][] = [
        [r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.left + r.width / 2, r.top + r.height / 2],
      ];
      const hit = points.some(([x, y]) =>
        document.elementsFromPoint(x, y).some((n) => n !== el && !el.contains(n) && n.closest("[data-floating-avoid]")),
      );
      setCovering(hit);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    schedule();
    // Re-check once layout settles (fonts, images, hydration) — nothing else triggers it before a scroll.
    const timers = [250, 800, 2000].map((ms) => window.setTimeout(schedule, ms));
    window.addEventListener("load", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("load", schedule);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  useEffect(() => {
    const on = (e: Event) => setChatOpen(Boolean((e as CustomEvent<{ open: boolean }>).detail?.open));
    window.addEventListener(CHAT_STATE_EVENT, on);
    return () => window.removeEventListener(CHAT_STATE_EVENT, on);
  }, []);

  // Keep the sign-in and register forms clear on small screens.
  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <div
      ref={stack}
      className={cn(
        "fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-end gap-2 sm:gap-2.5 transition-all duration-200 sm:right-6 sm:bottom-6",
        (chatOpen || covering) && "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <Action label="WhatsApp us">
        <a
          href={whatsappLink("Hi Elsasu, I'd like to make a booking.", business.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp us"
          className="grid size-11 place-items-center rounded-full bg-[#25D366] sm:size-12 text-white shadow-lg shadow-black/20 ring-1 ring-black/5 transition-transform hover:scale-105 active:scale-95"
        >
          <WhatsAppIcon className="size-5 sm:size-6" />
        </a>
      </Action>

      <Action label="Ask our assistant">
        <button
          type="button"
          onClick={() => openChat()}
          aria-label="Ask our assistant"
          className="relative grid size-11 place-items-center rounded-full bg-brand-ink sm:size-12 text-white shadow-lg shadow-black/20 ring-1 ring-white/10 transition-transform hover:scale-105 active:scale-95 dark:bg-white dark:text-brand-ink"
        >
          <MessageCircle className="size-5" />
          <span className="absolute top-0.5 right-0.5 size-3 rounded-full border-2 border-brand-ink bg-success dark:border-white" />
        </button>
      </Action>

      {pathname !== "/book" && (
        <Link
          href="/book"
          className="flex h-11 items-center gap-1.5 rounded-full bg-brand-orange pr-4 pl-3.5 text-sm font-semibold sm:h-12 sm:gap-2 sm:pr-5 sm:pl-4 sm:text-base text-brand-ink shadow-lg shadow-brand-orange/30 ring-1 ring-black/5 transition-transform hover:scale-[1.03] active:scale-95"
        >
          <CalendarCheck className="size-5" /> Book
        </Link>
      )}
    </div>
  );
}

/** Shows a small label to the left on hover (desktop). */
function Action({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group relative">
      {children}
      <span className="pointer-events-none absolute top-1/2 right-full mr-2.5 hidden -translate-y-1/2 rounded-lg bg-brand-ink px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 sm:block dark:bg-white dark:text-brand-ink">
        {label}
      </span>
    </div>
  );
}
