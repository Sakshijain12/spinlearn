import { describe, expect, it } from "vitest";
import sitemap from "../app/sitemap";
import robots from "../app/robots";
import { SITE_URL, jsonLd, publicMetadata, safeReturnPath } from "./site";
import { SAMPLE_TOPICS } from "./data";

describe("public SEO and account return paths", () => {
  it("lists all lessons and legal pages but no account or API endpoints", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toHaveLength(46);
    expect(new Set(urls).size).toBe(46);
    for (const topic of SAMPLE_TOPICS) expect(urls).toContain(`${SITE_URL}/lesson/${topic.slug}`);
    expect(urls).toContain(`${SITE_URL}/privacy`);
    expect(urls).toContain(`${SITE_URL}/declaration`);
    expect(urls.some((url) => /\/(?:login|register|api|settings|progress)/.test(url))).toBe(false);
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it("creates canonical metadata and safely serializes structured data", () => {
    const metadata = publicMetadata("Example", "Description", "/library");
    expect(metadata.alternates?.canonical).toBe("/library");
    expect(jsonLd({ text: "</script><script>bad</script>" })).not.toContain("<");
  });

  it("accepts local destinations only and rejects open redirects", () => {
    expect(safeReturnPath("/progress")).toBe("/progress");
    expect(safeReturnPath("/lesson/kv-cache")).toBe("/lesson/kv-cache");
    for (const value of ["https://evil.invalid", "//evil.invalid", "/\\evil.invalid", "/api/auth/logout", "/settings?redirect=evil"]) {
      expect(safeReturnPath(value)).toBe("/");
    }
  });

  it("gives every topic a two-sentence explanation rather than a single short line", () => {
    for (const topic of SAMPLE_TOPICS) {
      expect(topic.definition.length, topic.slug).toBeGreaterThanOrEqual(180);
      expect(topic.definition.length, topic.slug).toBeLessThanOrEqual(300);
      expect(topic.definition.split(/(?<=[.!?])\s+/).length, topic.slug).toBeGreaterThanOrEqual(2);
    }
  });
});
