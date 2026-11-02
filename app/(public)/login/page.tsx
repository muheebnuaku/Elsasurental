import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { CalendarCheck, ReceiptText, Repeat } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { stockPhotos } from "@/lib/stock-photos";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

const perks = [
  { icon: CalendarCheck, text: "Your trips and your driver's details" },
  { icon: ReceiptText, text: "Receipts and balances in one place" },
  { icon: Repeat, text: "Book again in a few taps" },
];

// Phone: dark brand band with the headline, and the form in a raised card overlapping it.
// Laptop: full-height split, brand panel on the left, form on the right.
export default function LoginPage() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] bg-muted/40 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:bg-background">
      <section className="relative isolate overflow-hidden bg-brand-ink px-5 pt-9 pb-28 text-white sm:px-8 lg:flex lg:flex-col lg:justify-end lg:p-14">
        <Image src={stockPhotos.hero} alt="" fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="-z-10 object-cover opacity-30" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-ink via-brand-ink/70 to-brand-ink/30" />
        <div aria-hidden className="absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-brand-orange/30 blur-3xl" />

        <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-lg">
          <p className="text-xs font-semibold tracking-[0.18em] text-brand-orange uppercase">Your Elsasu account</p>
          <h1 className="mt-2 text-[2rem] leading-[1.05] font-semibold tracking-tight text-balance sm:text-4xl lg:text-6xl">
            Every trip, <span className="font-display font-normal tracking-normal text-brand-orange italic">in one place.</span>
          </h1>
          <p className="mt-3 max-w-sm text-sm text-white/70 sm:text-base">Sign in with your phone number or Google. No password to remember.</p>
          <ul className="mt-8 hidden space-y-3 lg:block">
            {perks.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/85">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-4 text-brand-orange" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative -mt-20 px-4 pb-10 sm:px-6 lg:mt-0 lg:flex lg:items-center lg:justify-center lg:p-14">
        <div className="mx-auto w-full max-w-md rounded-3xl bg-card p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/5 sm:p-8 lg:mx-0 lg:p-0 lg:shadow-none lg:ring-0 dark:ring-white/10">
          <Suspense fallback={<Skeleton className="h-80 w-full rounded-2xl" />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
