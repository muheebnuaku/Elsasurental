import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { CalendarCheck, ReceiptText, Repeat } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { stockPhotos } from "@/lib/stock-photos";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

const perks = [
  { icon: CalendarCheck, text: "Track every trip and your driver's details" },
  { icon: ReceiptText, text: "Receipts and balances in one place" },
  { icon: Repeat, text: "Book again in a few taps" },
];

export default function LoginPage() {
  return (
    <div className="px-4 py-5 sm:px-6 sm:py-10 lg:py-14">
      <div className="mx-auto grid w-full max-w-md overflow-hidden rounded-3xl border bg-card shadow-sm lg:max-w-5xl lg:grid-cols-[1.05fr_1fr]">
        {/* photo panel: a slim banner on phones, a full side panel on laptops */}
        <aside className="relative h-32 sm:h-40 lg:h-auto lg:min-h-[580px]">
          <Image src={stockPhotos.hero} alt="" fill priority sizes="(min-width: 1024px) 520px, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-ink via-brand-ink/55 to-brand-ink/10" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white lg:p-10">
            <p className="font-display text-2xl text-brand-orange-text italic lg:text-4xl">{site.tagline}</p>
            <ul className="mt-5 hidden space-y-3 lg:block">
              {perks.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-white/85">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-white/15">
                    <Icon className="size-4 text-brand-orange" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="flex items-center justify-center px-5 py-7 sm:px-10 sm:py-10">
          <Suspense fallback={<Skeleton className="h-80 w-full max-w-sm rounded-2xl" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
