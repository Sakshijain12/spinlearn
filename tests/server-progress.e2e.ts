import { randomUUID } from "node:crypto";
import { expect, test } from "./fixtures";
import { accountStorageKey } from "../lib/account-storage";
import { initialLearningState, initialLessonProgress } from "../lib/learning";

test("progress survives a new browser context and never depends on local storage", async ({ page, browser, account, baseURL }) => {
  await page.goto("/lesson/lora");
  await page.getByRole("button", { name: "Complete & next", exact: true }).click();
  await expect(page.getByText(/^1 of 5 sections complete\./)).toBeVisible();
  await page.goto("/library?q=LoRA");
  await page.getByRole("button", { name: "Save LoRA", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unsave LoRA", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate((key) => localStorage.getItem(key), accountStorageKey(account.id))).toBeNull();
  const context = await browser.newContext();
  try {
    const login = await context.request.post(`${baseURL}/api/auth/login`, {
      headers: { Origin: new URL(baseURL!).origin }, data: { loginId: account.loginId, password: account.password },
    });
    expect(login.status()).toBe(200);
    const other = await context.newPage();
    await other.goto(`${baseURL}/lesson/lora`);
    await expect(other.locator("#step-title")).toHaveText("Intuition");
    await expect(other.getByText(/^1 of 5 sections complete\./)).toBeVisible();
    await other.goto(`${baseURL}/library?saved=1`);
    await expect(other.locator("article")).toHaveCount(1);
    await expect(other.locator("article").getByRole("link", { name: "LoRA", exact: true })).toBeVisible();
    const server = await context.request.get(`${baseURL}/api/v1/learning`);
    expect((await server.json()).state.progress.lora.completedSteps).toEqual([0]);
  } finally { await context.close(); }
});

test("previous browser progress requires consent and imports only once into an empty account", async ({ page, account }) => {
  const previous = initialLearningState();
  previous.bookmarks = ["kv-cache"];
  previous.progress.lora = { ...initialLessonProgress(), step: 2, completedSteps: [0, 1], visited: [0, 1, 2] };
  await page.addInitScript(({ key, value }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, value);
  }, { key: accountStorageKey(account.id), value: JSON.stringify(previous) });
  await page.goto("/library");
  await expect(page.getByRole("region", { name: "Previous browser progress", exact: true })).toBeVisible();
  expect((await (await page.request.get("/api/v1/learning")).json()).revision).toBe(0);
  await page.getByRole("button", { name: "Upload browser progress", exact: true }).click();
  await expect(page.getByRole("region", { name: "Previous browser progress", exact: true })).toHaveCount(0);
  expect((await (await page.request.get("/api/v1/learning")).json()).state).toEqual(previous);
  await page.reload();
  await expect(page.getByRole("region", { name: "Previous browser progress", exact: true })).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), accountStorageKey(account.id))).toBe(JSON.stringify(previous));
});

test("a failed server save is explicit and does not fabricate completed progress", async ({ page }) => {
  await page.goto("/lesson/lora");
  await expect(page.getByRole("button", { name: "Complete & next", exact: true })).toBeEnabled();
  await page.route("**/api/v1/learning", async (route) => {
    if (route.request().method() === "POST") await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "Test server save failure" } }) });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Complete & next", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Test server save failure" })).toBeVisible();
  await expect(page.locator("#step-title")).toHaveText("Concept");
  const stored = await (await page.request.get("/api/v1/learning")).json();
  expect(stored.state.progress.lora.completedSteps).toEqual([]);
});

test("one account cannot read or replace another account's progress", async ({ request, account, baseURL }) => {
  const response = await request.post("/api/v1/learning", {
    headers: { Origin: new URL(baseURL!).origin },
    data: { accountId: randomUUID(), requestId: randomUUID(), expectedRevision: 0, action: { type: "reset" } },
  });
  expect(response.status()).toBe(409);
  const saved = await request.get("/api/v1/learning");
  expect((await saved.json()).accountId).toBe(account.id);
});
