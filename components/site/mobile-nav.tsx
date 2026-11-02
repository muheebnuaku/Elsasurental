"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BusFront, House, Info, LayoutGrid, MapPinned, Menu, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/site/logo";
import { navLinks } from "@/components/site/nav-links";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { telLink, whatsappLink } from "@/lib/format";
import { useBusiness } from "@/components/business-provider";
import { UserButton } from "@/components/site/user-button";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { InstallAppRow, useInstallApp } from "@/components/site/install-app";
import { cn } from "@/lib/utils";

const icons: Record<(typeof navLinks)[number]["href"], typeof House> = {
  "/": House,
  "/fleet": BusFront,
  "/services": LayoutGrid,
  "/#destinations": MapPinned,
  "/about": Info,
};

const row = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors hover:bg-muted";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const business = useBusiness();
  const [install, clearInstall] = useInstallApp();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="lg:hidden" aria-label="Open menu">
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[76vw] max-w-[300px] gap-0 p-0 sm:max-w-[320px]"
        // Any link in the menu (pages, Sign in / My account, logo, Book) closes it.
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="flex h-16 shrink-0 items-center border-b px-4">
          <Logo className="[&_img]:h-8" />
        </div>

        <nav className="flex-1 overflow-y-auto p-2" aria-label="Mobile">
          {navLinks.map((l) => {
            const Icon = icons[l.href];
            const active = l.href === pathname;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(row, active && "bg-muted font-semibold")}
              >
                <Icon className={cn("size-[18px]", active ? "text-brand-orange" : "text-muted-foreground")} />
                {l.label}
              </Link>
            );
          })}
          <div className="mx-3 my-2 h-px bg-border" />
          <UserButton variant="row" className={cn(row, "[&_svg]:size-[18px] [&_svg]:text-muted-foreground")} />
          <ThemeToggle variant="row" className={cn(row, "[&_svg]:size-[18px] [&_svg]:text-muted-foreground")} />
          <InstallAppRow state={install} onDone={clearInstall} className={cn(row, "w-full [&_svg]:size-[18px] [&_svg]:text-muted-foreground")} />
        </nav>

        <div className="space-y-2 border-t p-3">
          <Button asChild variant="accent" size="lg" className="h-11 w-full rounded-xl text-[15px]">
            <Link href="/book">Book a van</Link>
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="lg" className="h-10 rounded-xl">
              <a href={telLink(business.phone)}>
                <Phone /> Call
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-10 rounded-xl">
              <a href={whatsappLink(undefined, business.whatsapp)} target="_blank" rel="noreferrer">
                <WhatsAppIcon className="size-4" /> WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
