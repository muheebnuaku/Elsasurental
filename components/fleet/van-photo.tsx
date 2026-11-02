import Image from "next/image";
import { VanArt } from "@/components/fleet/van-art";
import { stockVanPhoto } from "@/lib/stock-photos";
import { cn } from "@/lib/utils";

// Shows the first photo the admin uploaded for this van (vehicles.photos), otherwise a temporary
// stock photo of a similar van. `illustrate` forces the drawing (e.g. 404 page).
export function VanPhoto({
  photos,
  seats,
  category,
  alt,
  className,
  priority = false,
  sizes = "(min-width: 1024px) 40vw, 100vw",
  illustrate = false,
}: {
  photos: readonly string[] | null | undefined;
  seats: number;
  /** "suv" picks an SUV stock photo. */
  category?: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  illustrate?: boolean;
}) {
  const src = illustrate ? undefined : photos?.find(Boolean) ?? stockVanPhoto(seats, category);
  return (
    <div
      className={cn(
        "relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-secondary to-muted",
        className,
      )}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-[8%]">
          <VanArt seats={seats} className="max-h-full drop-shadow-sm" />
        </div>
      )}
    </div>
  );
}
