"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, Play, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type GalleryItem = { type: "image" | "video"; src: string };

const isVideo = (i: GalleryItem) => i.type === "video";

/** Swipeable photo/video gallery with thumbnails and a full-screen viewer. */
export function VanGallery({ items, title }: { items: GalleryItem[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState(false);
  const track = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (i: number) => {
      const n = (i + items.length) % items.length;
      setIndex(n);
      const el = track.current?.children[n] as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    },
    [items.length],
  );

  // Keep the index in sync when the customer swipes.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (!items.length) return null;

  return (
    <div className="space-y-2.5">
      <div
        className="group relative overflow-hidden rounded-2xl bg-muted"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(index + 1);
          if (e.key === "ArrowLeft") go(index - 1);
        }}
      >
        <div ref={track} className="flex aspect-[16/10] snap-x snap-mandatory overflow-x-auto" tabIndex={0} aria-label={`${title} photos`}>
          {items.map((item, i) => (
            <div key={item.src} className="relative h-full w-full shrink-0 snap-start">
              {isVideo(item) ? (
                <video src={item.src} controls playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : (
                <Image src={item.src} alt={`${title} photo ${i + 1}`} fill priority={i === 0} sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" />
              )}
            </div>
          ))}
        </div>

        {items.length > 1 && (
          <>
            <NavButton side="left" onClick={() => go(index - 1)} />
            <NavButton side="right" onClick={() => go(index + 1)} />
          </>
        )}
        <button
          type="button"
          onClick={() => setFull(true)}
          className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md hover:bg-black/70"
        >
          <Expand className="size-3.5" /> {index + 1} / {items.length}
        </button>
      </div>

      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {items.map((item, i) => (
            <button
              key={item.src}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show ${isVideo(item) ? "video" : "photo"} ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg ring-2 ring-transparent transition sm:w-24",
                i === index ? "ring-brand-orange" : "opacity-70 hover:opacity-100",
              )}
            >
              {isVideo(item) ? (
                <span className="grid h-full w-full place-items-center bg-brand-ink text-white"><Play className="size-5" /></span>
              ) : (
                <Image src={item.src} alt="" fill sizes="96px" className="object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent showCloseButton={false} className="h-[100dvh] max-w-none gap-0 rounded-none border-0 bg-black p-0 sm:max-w-none">
          <DialogTitle className="sr-only">{title} gallery</DialogTitle>
          <div className="relative flex h-full items-center justify-center">
            {isVideo(items[index]!) ? (
              <video src={items[index]!.src} controls autoPlay playsInline className="max-h-full max-w-full" />
            ) : (
              <Image src={items[index]!.src} alt={`${title} photo ${index + 1}`} fill sizes="100vw" className="object-contain" />
            )}
            <button type="button" onClick={() => setFull(false)} className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20" aria-label="Close">
              <X />
            </button>
            {items.length > 1 && (
              <>
                <NavButton side="left" onClick={() => setIndex((index - 1 + items.length) % items.length)} always />
                <NavButton side="right" onClick={() => setIndex((index + 1) % items.length)} always />
              </>
            )}
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white tabular-nums">
              {index + 1} / {items.length}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NavButton({ side, onClick, always = false }: { side: "left" | "right"; onClick: () => void; always?: boolean }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous" : "Next"}
      className={cn(
        "absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-brand-ink shadow-md backdrop-blur transition hover:bg-white",
        side === "left" ? "left-3" : "right-3",
        !always && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
