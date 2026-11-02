import { randomBytes } from "node:crypto";
import { expect, test } from "playwright/test";
import { initialLearningState, STORAGE_KEY } from "../lib/learning";
import { accountStorageKey } from "../lib/account-storage";
import { authResponseSchema } from "../lib/auth/validation";

test("Login again opens a real password form, server progress persists, and bad credentials are rejected", async ({ page, context, baseURL }) => {
  const loginId = `learner-${randomBytes(8).toString("hex")}`;
  const password = randomBytes(24).toString("base64url");
  await page.goto("/signed-out");
  await page.getByRole("link", { name: "Login again", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password", exact: true }).click();
  await page.getByRole("link", { name: "Create account", exact: true }).click();
  await page.getByLabel("Display name", { exact: true }).fill("New learner");
  await page.getByLabel("Login ID", { exact: true }).fill(loginId);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(`${password}x`);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("form", { name: "Create account", exact: true }).getByRole("alert")).toHaveText("The passwords do not match.");
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What will you learn today?", exact: true })).toBeVisible();
  const { account } = authResponseSchema.parse(await (await page.request.get("/api/auth/session")).json());
  await expect(page.getByRole("button", { name: "Open profile menu", exact: true })).toBeEnabled();
  const local = await page.evaluate((key) => ({
    state: localStorage.getItem(key),
    browserData: JSON.stringify(Object.values(localStorage)),
  }), accountStorageKey(account.id));
  expect(local.state).toBeNull();
  expect(local.browserData).not.toContain(password);
  const saved = await page.request.post("/api/v1/learning", {
    headers: { Origin: new URL(baseURL!).origin },
    data: { accountId: account.id, requestId: crypto.randomUUID(), action: { type: "bookmark", slug: "lora", saved: true } },
  });
  expect(saved.status()).toBe(200);
  const sessionCookie = (await context.cookies()).find((cookie) => cookie.name === "spinlearn_session");
  expect(sessionCookie?.httpOnly).toBe(true);
  expect(sessionCookie?.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain("spinlearn_session");

  await page.getByRole("button", { name: "Open profile menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await page.getByRole("link", { name: "Login again", exact: true }).click();
  await page.getByLabel("Login ID", { exact: true }).fill(loginId);
  await page.getByLabel("Password", { exact: true }).fill(`${password}wrong`);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("form", { name: "Log in", exact: true }).getByRole("alert")).toHaveText("The login ID or password is incorrect.");
  expect((await page.request.get("/api/auth/session")).status()).toBe(401);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What will you learn today?", exact: true })).toBeVisible();
  await page.goto("/library?saved=1");
  await expect(page.locator("article").getByRole("link", { name: "LoRA", exact: true })).toBeVisible();
});

test("two accounts never share local profile, bookmarks, or progress", async ({ page, baseURL }) => {
  const firstLogin = `owner-${randomBytes(8).toString("hex")}`;
  const secondLogin = `other-${randomBytes(8).toString("hex")}`;
  const password = randomBytes(24).toString("base64url");
  const register = async (loginId: string, displayName: string) => {
    const response = await page.request.post("/api/auth/register", {
      headers: { Origin: new URL(baseURL!).origin },
      data: { loginId, displayName, password, confirmPassword: password },
    });
    expect(response.status()).toBe(201);
    return authResponseSchema.parse(await response.json()).account;
  };
  const first = await register(firstLogin, "First learner");
  await page.goto("/library?q=LoRA");
  await page.getByRole("button", { name: "Save LoRA", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unsave LoRA", exact: true })).toBeVisible();
  const firstProgress = (await (await page.request.get("/api/v1/learning")).json()).state;
  await page.getByRole("button", { name: "Open profile menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You're signed out", exact: true })).toBeVisible();
  const second = await register(secondLogin, "Second learner");
  await page.goto("/library?saved=1");
  await expect(page.getByRole("heading", { name: "Make room for your next idea", exact: true })).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("Second learner");
  expect(first.id).not.toBe(second.id);
  const secondProgress = (await (await page.request.get("/api/v1/learning")).json()).state;
  expect(firstProgress.bookmarks).toEqual(["lora"]);
  expect(secondProgress.bookmarks).toEqual([]);
});

test("protected pages and APIs reject missing or revoked sessions, including forged local preview flags", async ({ page, request, baseURL, playwright }) => {
  for (const route of ["/settings", "/progress"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?next=/);
  }
  for (const route of ["/api/v1/learning", "/api/auth/session"]) {
    expect((await request.get(route)).status()).toBe(401);
  }
  expect((await request.post("/api/v1/spin", { data: {} })).status()).toBe(201);
  expect((await request.get("/api/v1/lessons/kv-cache")).status()).toBe(200);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: STORAGE_KEY, value: JSON.stringify(initialLearningState()) });
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?next=/);

  const password = randomBytes(24).toString("base64url");
  const created = await request.post("/api/auth/register", {
    headers: { Origin: new URL(baseURL!).origin },
    data: { loginId: `revoked-${randomBytes(8).toString("hex")}`, displayName: "Learner", password, confirmPassword: password },
  });
  expect(created.status()).toBe(201);
  const staleCookies = await request.storageState();
  const stale = await playwright.request.newContext({ baseURL, storageState: staleCookies });
  try {
    expect((await stale.get("/api/auth/session")).status()).toBe(200);
    expect((await request.post("/api/auth/logout", { headers: { Origin: new URL(baseURL!).origin } })).status()).toBe(200);
    expect((await stale.get("/api/auth/session")).status()).toBe(401);
    expect((await stale.get("/api/v1/learning")).status()).toBe(401);
    expect((await stale.get("/api/v1/lessons/kv-cache")).status()).toBe(200);
  } finally {
    await stale.dispose();
  }
});

test("login rejects cross-origin requests, duplicate IDs, and repeated guesses", async ({ request, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const loginId = `limits-${randomBytes(8).toString("hex")}`;
  const password = randomBytes(24).toString("base64url");
  const data = { loginId, displayName: "Learner", password, confirmPassword: password };
  expect((await request.post("/api/auth/register", { headers: { Origin: "https://unrelated.invalid" }, data })).status()).toBe(403);
  expect((await request.post("/api/auth/register", { headers: { Origin: origin }, data })).status()).toBe(201);
  expect((await request.post("/api/auth/register", { headers: { Origin: origin }, data })).status()).toBe(409);
  await request.post("/api/auth/logout", { headers: { Origin: origin } });
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await request.post("/api/auth/login", { headers: { Origin: origin }, data: { loginId, password: `${password}wrong` } });
    expect(response.status()).toBe(401);
  }
  const limited = await request.post("/api/auth/login", { headers: { Origin: origin }, data: { loginId, password } });
  expect(limited.status()).toBe(429);
  expect(limited.headers()["retry-after"]).toBe("900");
});

test("login forms fit mobile screens and work without displaying passwords", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const route of ["/login", "/register", "/signed-out"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (route !== "/signed-out") {
      await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
    }
  }
});
