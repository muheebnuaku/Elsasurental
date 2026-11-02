import Link from "next/link";
import { NavMenu } from "@/components/site/nav-menu";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";
import { MobileNav } from "@/components/site/mobile-nav";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { UserButton } from "@/components/site/user-button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/20 bg-background/55 shadow-[0_1px_0_rgba(0,0,0,0.03),0_8px_24px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-background/45">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <NavMenu />
        <div className="flex items-center gap-1">
          <ThemeToggle className="hidden lg:inline-flex" />
          <UserButton />
          <Button asChild variant="accent" size="lg" className="hidden h-10 rounded-xl px-4 sm:inline-flex">
            <Link href="/book">Book now</Link>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
