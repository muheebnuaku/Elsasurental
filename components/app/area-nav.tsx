"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AreaNavItem } from "@/components/app/app-shell";

export function AreaNav({ items }: { items: AreaNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex min-w-0 gap-0.5 overflow-x-auto" aria-label="Section">
      {items.map((i) => {
        const active = i.href === "/admin" || i.href === "/account" || i.href === "/driver" ? pathname === i.href : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium",
              active ? "bg-brand-ink text-white dark:bg-white dark:text-brand-ink" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
