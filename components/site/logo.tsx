import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import logoLight from "@/public/brand/logo.png";
import logoDark from "@/public/brand/logo-dark.png";

// Real Elsasu logo (from public/vans). `inverted` = always the white version (black backgrounds);
// otherwise it follows light/dark mode.
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4", className)}
      aria-label="Elsasu Rentals — home"
    >
      {inverted ? (
        <Image src={logoDark} alt="Elsasu Rentals" priority className="h-9 w-auto sm:h-10" />
      ) : (
        <>
          <Image src={logoLight} alt="Elsasu Rentals" priority className="h-9 w-auto sm:h-10 dark:hidden" />
          <Image src={logoDark} alt="" aria-hidden priority className="hidden h-9 w-auto sm:h-10 dark:block" />
        </>
      )}
    </Link>
  );
}
