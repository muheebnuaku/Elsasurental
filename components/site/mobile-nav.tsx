"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/site/logo";
import { navLinks } from "@/components/site/nav-links";
import { site } from "@/lib/site";
import { telLink } from "@/lib/format";
import { formatGhanaPhone } from "@/lib/phone";
import { UserButton } from "@/components/site/user-button";
import { ThemeToggle } from "@/components/site/theme-toggle";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="lg:hidden" aria-label="Open menu">
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[86vw] max-w-sm p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="flex h-full flex-col">
          <div className="border-b p-5">
            <Logo />
          </div>
          <nav className="flex flex-col p-3" aria-label="Mobile">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2.5 text-base font-medium hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
            <UserButton variant="row" />
            <ThemeToggle variant="row" />
          </nav>
          <div className="mt-auto space-y-3 border-t p-5">
            <Button asChild variant="accent" size="xl" className="w-full">
              <Link href="/book" onClick={() => setOpen(false)}>Book a van</Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="w-full">
              <a href={telLink()}>
                <Phone /> Call {formatGhanaPhone(site.phone)}
              </a>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
