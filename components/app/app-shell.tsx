import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { AreaNav } from "@/components/app/area-nav";
import { SignOutButton } from "@/components/app/sign-out-button";
import { formatGhanaPhone } from "@/lib/phone";
import type { SessionUser } from "@/lib/supabase/server";

export type AreaNavItem = { href: string; label: string };

const roleLabel: Record<SessionUser["role"], string> = {
  customer: "Customer",
  corporate_admin: "Company admin",
  driver: "Driver",
  admin: "Admin",
};

/** Compact shell for signed-in areas (account, driver, admin). */
export function AppShell({ user, nav, children }: { user: SessionUser; nav: AreaNavItem[]; children: React.ReactNode }) {
  const initials = (user.fullName ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-secondary/40">
      <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Logo className="[&_img]:h-8 sm:[&_img]:h-9" />
          <AreaNav items={nav} />
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-semibold">{user.fullName ?? "Welcome"}</p>
              <p className="text-xs text-muted-foreground">
                {roleLabel[user.role]}
                {user.phone ? ` · ${formatGhanaPhone(user.phone)}` : ""}
              </p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-brand-ink text-xs font-semibold text-white dark:bg-white dark:text-brand-ink" aria-hidden>
              {initials}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">← Back to the website</Link>
      </footer>
    </div>
  );
}
