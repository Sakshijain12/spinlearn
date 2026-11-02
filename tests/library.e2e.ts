import { expect, test } from "playwright/test";

test("Library supports direct loads, filtering, pagination, and lesson navigation", async ({ page }) => {
  const response = await page.goto("/library");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(20);
  await page.getByRole("button", { name: "Show more topics", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(40);
  await page.getByRole("button", { name: "Show more topics", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(42);
  await page.getByRole("searchbox", { name: "Search topics", exact: true }).fill("KV cache");
  await expect(page.locator("article")).toHaveCount(1);
  const reload = await page.reload();
  expect(reload?.status()).toBe(200);
  await expect(page.getByRole("searchbox", { name: "Search topics", exact: true })).toHaveValue("KV cache");
  await expect(page.locator("article")).toHaveCount(1);
  await page.locator("article").getByRole("link", { name: "KV cache", exact: true }).click();
  await expect(page).toHaveURL(/\/lesson\/kv-cache$/);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Reset filters", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(20);
});

test("Library keeps server-rendered catalogue content and canonical metadata", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const response = await page.goto(`${baseURL}/library`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("AI learning library | Spinlearn");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://spinlearn-rosy.vercel.app/library");
    await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
    await expect(page.locator("article")).toHaveCount(20);
  } finally {
    await context.close();
  }
});
