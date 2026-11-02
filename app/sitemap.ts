import type { MetadataRoute } from "next";
import { SAMPLE_TOPICS } from "@/lib/data";
import { INDEXABLE, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!INDEXABLE) return [];
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/library`, changeFrequency: "weekly", priority: 0.9 },
    ...SAMPLE_TOPICS.map((topic) => ({
      url: `${SITE_URL}/lesson/${topic.slug}`, changeFrequency: "monthly" as const, priority: 0.8,
    })),
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/declaration`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
