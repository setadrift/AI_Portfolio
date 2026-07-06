import type { MetadataRoute } from "next";
import { SITE, PROJECTS } from "@/lib/constants";
import { WORKFLOW_VERTICALS } from "@/lib/ai-workflow-verticals";

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

    pages.push({
      url: `${SITE.url}${prefix}/ai-workflow-audit`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    });

    pages.push({
      url: `${SITE.url}${prefix}/ai-consulting-small-business`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    });

    pages.push({
      url: `${SITE.url}${prefix}/work-samples`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    });

    if (locale === "en") {
      pages.push({
        url: `${SITE.url}/automation-rescue`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.9,
      });

      for (const vertical of WORKFLOW_VERTICALS) {
        pages.push({
          url: `${SITE.url}/ai-workflow-audit/${vertical.slug}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.85,
        });
      }
    }

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
