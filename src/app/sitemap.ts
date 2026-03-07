import type { MetadataRoute } from "next";
import { SITE, PROJECTS } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ["en", "fr"] as const;

  const pages: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    const prefix = locale === "en" ? "" : `/${locale}`;

    pages.push({
      url: `${SITE.url}${prefix}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    });

    for (const project of PROJECTS) {
      pages.push({
        url: `${SITE.url}${prefix}/projects/${project.slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.8,
      });
    }
  }

  return pages;
}
