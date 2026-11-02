import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Route and location pages (/routes/[slug], /locations/[area]) are added in Phase 3.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/fleet", "/services", "/book", "/about", "/terms", "/privacy"];
  return pages.map((p) => ({
    url: `${site.url}${p}`,
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : p === "/book" || p === "/fleet" ? 0.9 : 0.6,
  }));
}
