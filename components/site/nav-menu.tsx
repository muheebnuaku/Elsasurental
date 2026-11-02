"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navLinks } from "@/components/site/nav-links";

/** Desktop nav with the current page highlighted. */
export function NavMenu() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-0.5 rounded-full border border-black/5 bg-white/40 p-1 shadow-inner shadow-black/[0.03] backdrop-blur-md lg:flex dark:border-white/10 dark:bg-white/5" aria-label="Main">
      {navLinks.map((l) => {
        const active = l.href === "/" ? pathname === "/" : !l.href.includes("#") && pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-brand-ink text-white dark:bg-white dark:text-brand-ink" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
