import { cn } from "@/lib/utils";

export function Section({
  id,
  className,
  children,
  tone = "default",
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
  tone?: "default" | "muted" | "ink";
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 py-10 sm:py-14 lg:py-16",
        tone === "muted" && "bg-secondary/60",
        tone === "ink" && "bg-brand-ink text-white",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("mb-6 max-w-2xl sm:mb-8", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-brand-orange-text uppercase">{eyebrow}</p>
      )}
      <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl lg:text-[2.15rem]">{title}</h2>
      {intro && <p className="mt-2 text-pretty opacity-75 sm:text-lg">{intro}</p>}
    </div>
  );
}

export function PageHero({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: string }) {
  return (
    <div className="relative overflow-hidden bg-brand-ink text-white">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_100%_0%,rgba(234,88,12,0.22),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        {eyebrow && <p className="mb-3 text-sm font-semibold tracking-wider text-brand-orange-text uppercase">{eyebrow}</p>}
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-lg text-pretty text-white/75">{intro}</p>}
      </div>
    </div>
  );
}
