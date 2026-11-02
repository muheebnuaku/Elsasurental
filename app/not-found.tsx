import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VanArt } from "@/components/fleet/van-art";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <VanArt seats={8} className="max-w-xs opacity-90" />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Wrong turn</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">We couldn&apos;t find that page. Let&apos;s get you back on the road.</p>
      <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row">
        <Button asChild variant="accent" size="xl" className="sm:flex-1"><Link href="/">Home</Link></Button>
        <Button asChild variant="outline" size="xl" className="sm:flex-1"><Link href="/book">Book a van</Link></Button>
      </div>
    </main>
  );
}
