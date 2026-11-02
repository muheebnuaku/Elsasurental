import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { stockPhotos } from "@/lib/stock-photos";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-2 lg:items-center lg:gap-12">
      <div className="relative hidden aspect-[4/5] overflow-hidden rounded-3xl lg:block">
        <Image src={stockPhotos.hero} alt="" fill sizes="45vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-ink via-brand-ink/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-8 text-white">
          <p className="font-display text-3xl text-brand-orange-text italic">{site.tagline}</p>
          <p className="mt-2 max-w-sm text-white/75">Track your trips, see receipts and book again in seconds.</p>
        </div>
      </div>
      <div className="flex justify-center lg:justify-start">
        <Suspense fallback={<Skeleton className="h-72 w-full max-w-sm rounded-2xl" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
