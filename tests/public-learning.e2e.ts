import { expect, test } from "playwright/test";
import { SAMPLE_TOPICS } from "../lib/data";

test("guests can land, browse, spin, and complete lessons without a login redirect", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "What will you learn today?", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start spinning", exact: true }).click();
  await expect(page.getByRole("link", { name: "Start lesson", exact: true })).toBeVisible();
  await page.goto("/library");
  await expect(page.locator("article")).toHaveCount(20);
  await page.goto("/lesson/kv-cache");
  await expect(page.getByRole("heading", { name: "KV cache", exact: true })).toBeVisible();
  for (let index = 0; index < 4; index += 1) await page.getByRole("button", { name: "Complete & next", exact: true }).click();
  const questions = page.locator("main fieldset");
  await questions.nth(0).getByRole("radio").nth(1).check();
  await questions.nth(1).getByRole("radio").nth(1).check();
  await page.getByRole("button", { name: "Check answers", exact: true }).click();
  await page.getByRole("button", { name: "Mark as learned", exact: true }).click();
  await expect(page.getByRole("heading", { name: "One more idea, understood", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "View your progress", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fprogress$/);
  expect((await page.request.get("/api/v1/learning")).status()).toBe(401);
});

test("public lesson and legal content are readable without JavaScript and have canonical SEO metadata", async ({ browser, baseURL, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    const response = await page.goto(`${baseURL}/lesson/mixture-of-experts`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Mixture of experts", exact: true, level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Concept", exact: true })).toContainText("router");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://spinlearn-rosy.vercel.app/lesson/mixture-of-experts");
    await expect(page).toHaveTitle(/Mixture of experts.*Spinlearn/);
    const data = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(data.some((value) => JSON.parse(value)["@type"] === "LearningResource")).toBe(true);
    await page.goto(`${baseURL}/privacy`);
    await expect(page.getByRole("heading", { name: "Privacy policy", exact: true })).toBeVisible();
    await expect(page.locator("main")).toContainText("Sakshi");
    await expect(page.locator("main")).toContainText("spinlearn025@gmail.com");
    await page.goto(`${baseURL}/declaration`);
    await expect(page.getByRole("heading", { name: "Declaration and terms", exact: true })).toBeVisible();
    await expect(page.locator("main")).toContainText("AI tools assisted");
  } finally { await context.close(); }
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect((xml.match(/<loc>/g) ?? []).length).toBe(46);
  for (const topic of SAMPLE_TOPICS) expect(xml).toContain(`/lesson/${topic.slug}`);
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /api/");
  const image = await request.get("/opengraph-image");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
});

test("the topic flashcard displays a multi-line explanation on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Start spinning", exact: true }).click();
  const card = page.getByRole("region", { name: "Today's topic", exact: true });
  await expect(card).toBeVisible();
  const paragraph = card.locator(":scope > p");
  const layout = await paragraph.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
    chars: element.textContent?.length ?? 0,
  }));
  expect(layout.chars).toBeGreaterThanOrEqual(180);
  expect(layout.height / layout.lineHeight).toBeGreaterThanOrEqual(2);
  expect(layout.height / layout.lineHeight).toBeLessThanOrEqual(3);
});
