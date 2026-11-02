import { Briefcase, Church, Flower2, Heart, Map, Plane } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { services } from "@/lib/content";

const icons: Record<(typeof services)[number]["icon"], LucideIcon> = {
  plane: Plane,
  heart: Heart,
  flower: Flower2,
  church: Church,
  map: Map,
  briefcase: Briefcase,
};

export function ServiceIcon({ name, className }: { name: keyof typeof icons; className?: string }) {
  const Icon = icons[name];
  return <Icon className={className} aria-hidden />;
}
