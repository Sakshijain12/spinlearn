import type { MetadataRoute } from "next";
import { INDEXABLE, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return INDEXABLE ? {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/login", "/register", "/signed-out", "/progress", "/settings"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  } : { rules: { userAgent: "*", disallow: "/" } };
}
