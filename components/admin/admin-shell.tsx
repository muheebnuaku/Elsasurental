"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  Car,
  ClipboardList,
  ExternalLink,
  IdCard,
  LayoutDashboard,
  MessageSquareText,
  MapPinned,
  Menu,
  PhoneCall,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Admin layout. Laptop: dark sidebar with grouped sections. Phone: slim top bar, a bottom tab bar
// for the four everyday screens, and "More" for everything else.

type Item = { href: string; label: string; icon: LucideIcon };

const groups: { title: string; items: Item[] }[] = [
  {
    title: "Operations",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
      { href: "/admin/bookings/new", label: "Phone booking", icon: PhoneCall },
      { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/admin/assistant", label: "Assistant", icon: MessageSquareText },
    ],
  },
  {
    title: "Fleet & prices",
    items: [
      { href: "/admin/vehicles", label: "Vehicles", icon: Car },
      { href: "/admin/pricing", label: "Places & extras", icon: MapPinned },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/drivers", label: "Drivers", icon: IdCard },
    ],
  },
  { title: "Settings", items: [{ href: "/admin/business", label: "Business details", icon: Building2 }] },
];

const all = groups.flatMap((g) => g.items);
const tabs = ["/admin", "/admin/bookings", "/admin/calendar", "/admin/vehicles"].map((h) => all.find((i) => i.href === h)!);

/** The most specific nav item that matches the current page ("/admin/bookings/new" beats "/admin/bookings"). */
function activeHref(pathname: string) {
  return all
    .filter((i) => (i.href === "/admin" ? pathname === "/admin" : pathname === i.href || pathname.startsWith(`${i.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export type AdminUser = { name: string; detail: string; initials: string };

function UserCard({ user, dark }: { user: AdminUser; dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold", dark ? "bg-brand-orange text-brand-ink" : "bg-brand-ink text-white dark:bg-white dark:text-brand-ink")}>
        {user.initials}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className={cn("truncate text-xs", dark ? "text-white/55" : "text-muted-foreground")}>{user.detail}</p>
      </div>
    </div>
  );
}

function NavList({ current, dark, onNavigate }: { current?: string; dark?: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="space-y-5">
      {groups.map((g) => (
        <div key={g.title}>
          <p className={cn("mb-1.5 px-3 text-[11px] font-semibold tracking-[0.14em] uppercase", dark ? "text-white/40" : "text-muted-foreground")}>{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map(({ href, label, icon: Icon }) => {
              const on = href === current;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-medium transition-colors",
                      dark
                        ? on ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                        : on ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {on && <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-brand-orange" aria-hidden />}
                    <Icon className={cn("size-[18px]", on && "text-brand-orange")} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ user, children }: { user: AdminUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const current = activeHref(pathname);
  const [more, setMore] = useState(false);

  return (
    <div className="min-h-dvh bg-secondary/40 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* Laptop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-brand-ink px-3 py-5 text-white lg:flex">
        <div className="px-3">
          <Logo inverted className="[&_img]:h-9" />
          <p className="mt-1 text-[11px] font-semibold tracking-[0.18em] text-brand-orange uppercase">Admin</p>
        </div>
        <div className="mt-6 flex-1 overflow-y-auto">
          <NavList current={current} dark />
        </div>
        <div className="space-y-3 border-t border-white/10 px-3 pt-4">
          <UserCard user={user} dark />
          <div className="flex items-center gap-1 [&_button]:text-white/70 [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
            <Link href="/" className="inline-flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-sm whitespace-nowrap text-white/70 hover:bg-white/10 hover:text-white">
              <ExternalLink className="size-4 shrink-0" /> Website
            </Link>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        {/* Phone top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-xl lg:hidden">
          <Logo className="[&_img]:h-7" />
          <span className="rounded-full bg-brand-ink px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-white uppercase dark:bg-white dark:text-brand-ink">Admin</span>
          <span className="flex-1" />
          <ThemeToggle />
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:py-9">{children}</main>
      </div>

      {/* Phone bottom tabs */}
      <nav aria-label="Admin quick" className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {tabs.map(({ href, label, icon: Icon }) => {
            const on = href === current;
            return (
              <li key={href}>
                <Link href={href} aria-current={on ? "page" : undefined} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", on ? "text-foreground" : "text-muted-foreground")}>
                  <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", on && "bg-brand-orange/15 text-brand-orange-text")}>
                    <Icon className="size-5" />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <Sheet open={more} onOpenChange={setMore}>
              <SheetTrigger asChild>
                <button type="button" className={cn("flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium", tabs.some((t) => t.href === current) ? "text-muted-foreground" : "text-foreground")}>
                  <span className={cn("grid h-7 w-12 place-items-center rounded-full", !tabs.some((t) => t.href === current) && "bg-brand-orange/15 text-brand-orange-text")}>
                    <Menu className="size-5" />
                  </span>
                  More
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[80vw] max-w-[320px] gap-0 p-0">
                <SheetTitle className="sr-only">Admin menu</SheetTitle>
                <div className="border-b p-4"><UserCard user={user} /></div>
                <div className="flex-1 overflow-y-auto p-2 py-4">
                  <NavList current={current} onNavigate={() => setMore(false)} />
                </div>
                <div className="flex items-center gap-1 border-t p-3">
                  <Link href="/" onClick={() => setMore(false)} className="inline-flex h-9 flex-1 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                    <ExternalLink className="size-4" /> View website
                  </Link>
                  <SignOutButton />
                </div>
              </SheetContent>
            </Sheet>
          </li>
        </ul>
      </nav>
    </div>
  );
}
