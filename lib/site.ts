import type { Metadata } from "next";

const configured = new URL(process.env.SITE_URL ?? "https://spinlearn-rosy.vercel.app");
if (configured.protocol !== "https:" || configured.pathname !== "/" || configured.search || configured.hash || configured.username) {
  throw new Error("SITE_URL must be the canonical HTTPS origin without a path.");
}

export const SITE_URL = configured.origin;
export const SITE_DESCRIPTION = "Learn AI concepts through clear explanations, worked examples, Python code, and quizzes. Explore 42 free lessons at your own pace.";
export const INDEXABLE = process.env.VERCEL_ENV !== "preview";

export function publicMetadata(title: string, description: string, path: string): Metadata {
  return {
    title, description, alternates: { canonical: path },
    robots: { index: INDEXABLE, follow: INDEXABLE },
    openGraph: {
      title, description, url: path, siteName: "Spinlearn", type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Spinlearn: learn one AI concept at a time" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}

export const PRIVATE_ROBOTS: Metadata["robots"] = { index: false, follow: false };

export function safeReturnPath(value: unknown): string {
  return typeof value === "string" && /^\/(?:library|progress|settings|lesson\/[a-z0-9-]+)?$/.test(value) ? value : "/";
}

export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
