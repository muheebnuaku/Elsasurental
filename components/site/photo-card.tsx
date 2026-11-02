import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact card with a real photo as its background and text on a soft gradient. */
export function PhotoCard({
  href,
  image,
  title,
  eyebrow,
  description,
  badge,
  footer,
  className,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
  id,
}: {
  href: string;
  image: string | null | undefined;
  title: string;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  sizes?: string;
  id?: string;
}) {
  return (
    <Link
      id={id}
      href={href}
      className={cn(
        "group relative isolate flex min-h-44 scroll-mt-24 flex-col justify-end overflow-hidden rounded-2xl bg-brand-ink text-white shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2",
        className,
      )}
    >
      {image && (
        <Image
          src={image}
          alt=""
          fill
          sizes={sizes}
          className="-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/40 to-black/5" />

      {badge && (
        <span className="absolute top-2.5 right-2.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-brand-ink tabular-nums shadow-sm backdrop-blur">
          {badge}
        </span>
      )}
      <span className="absolute top-2.5 left-2.5 grid size-8 place-items-center rounded-full bg-white/15 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
        <ArrowUpRight className="size-4" />
      </span>

      <div className="p-3.5 sm:p-4">
        {eyebrow && <p className="text-[11px] font-semibold tracking-wider text-white/70 uppercase">{eyebrow}</p>}
        <h3 className="text-base leading-tight font-semibold sm:text-lg">{title}</h3>
        {description && <p className="mt-1 line-clamp-1 text-sm text-white/80 sm:line-clamp-2">{description}</p>}
        {footer && <div className="mt-2 text-xs text-white/75">{footer}</div>}
      </div>
    </Link>
  );
}
