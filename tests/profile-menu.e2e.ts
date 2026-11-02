import { expect, test } from "./fixtures";
import { initialLearningState, initialLessonProgress, STORAGE_KEY, learningStateSchema } from "../lib/learning";
import { accountStorageKey } from "../lib/account-storage";

test("hover opens both profile actions and supports moving into the dropdown", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open profile menu", exact: true });
  const menu = page.getByRole("menu", { name: "Profile", exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.hover();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(menu.getByRole("menuitem", { name: "View profile", exact: true })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Sign out", exact: true })).toBeVisible();
  await menu.getByRole("menuitem", { name: "View profile", exact: true }).hover();
  await expect(menu).toBeVisible();
  await page.getByRole("heading", { level: 1 }).hover();
  await expect(menu).toHaveCount(0);
  await trigger.hover();
  await menu.getByRole("menuitem", { name: "View profile", exact: true }).click();
  await expect(page).toHaveURL(/\/settings#profile$/);
  await expect(page.getByRole("form", { name: "Your profile", exact: true })).toBeVisible();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("Alex Kim");
  await expect(menu).toHaveCount(0);
});

test("click, outside click, keyboard navigation, and Escape work without hover-only traps", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open profile menu", exact: true });
  const menu = page.getByRole("menu", { name: "Profile", exact: true });
  const profile = page.getByRole("menuitem", { name: "View profile", exact: true });
  const signOut = page.getByRole("menuitem", { name: "Sign out", exact: true });
  await trigger.click();
  await expect(menu).toBeVisible();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(menu).toHaveCount(0);

  await trigger.focus();
  await trigger.press("ArrowDown");
  await expect(profile).toBeFocused();
  await profile.press("ArrowDown");
  await expect(signOut).toBeFocused();
  await signOut.press("ArrowDown");
  await expect(profile).toBeFocused();
  await profile.press("End");
  await expect(signOut).toBeFocused();
  await signOut.press("Home");
  await expect(profile).toBeFocused();
  await profile.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.press("ArrowUp");
  await expect(signOut).toBeFocused();
  await signOut.press("Tab");
  await expect(menu).toHaveCount(0);
  await trigger.focus();
  await trigger.press("Enter");
  await expect(profile).toBeFocused();
  await profile.press("Enter");
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
});

test.describe("touch profile menu", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("opens on tap and keeps the dropdown within the phone viewport", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Open profile menu", exact: true });
    const menu = page.getByRole("menu", { name: "Profile", exact: true });
    await trigger.tap();
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    await trigger.tap();
    await expect(menu).toHaveCount(0);
    await trigger.tap();
    await menu.getByRole("menuitem", { name: "View profile", exact: true }).tap();
    await expect(page).toHaveURL(/\/settings#profile$/);
    await expect(page.getByRole("form", { name: "Your profile", exact: true })).toBeVisible();
  });
});

test("sign-out requires login again and preserves account learning data", async ({ page, account }) => {
  const saved = initialLearningState();
  saved.profile = { displayName: "Taylor Lee", timezone: "Asia/Tokyo" };
  saved.bookmarks = ["kv-cache", "lora"];
  saved.progress["kv-cache"] = {
    ...initialLessonProgress(), step: 2, visited: [0, 1, 2], completedSteps: [0, 1],
    quickCheck: { answers: [0], score: 1 },
  };
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key: STORAGE_KEY, state: saved });
  await page.goto("/library");
  await page.getByRole("button", { name: "Open profile menu", exact: true }).hover();
  await expect(page.getByText("Taylor Lee", { exact: true })).toBeVisible();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You're signed out", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Login again", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Library", exact: true })).toHaveCount(0);

  const signedOutData = learningStateSchema.parse(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), accountStorageKey(account.id)));
  expect(signedOutData).toEqual(saved);
  await page.reload();
  await expect(page.getByRole("heading", { name: "You're signed out", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Login again", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("form", { name: "Your profile", exact: true })).toHaveCount(0);
  await page.getByLabel("Login ID", { exact: true }).fill(account.loginId);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What will you learn today?", exact: true })).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("Taylor Lee");
  const resumedData = learningStateSchema.parse(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), accountStorageKey(account.id)));
  expect(resumedData).toEqual(saved);
});

test("sign-out and login synchronize between tabs", async ({ page, context, account }) => {
  await page.goto("/library");
  const second = await context.newPage();
  try {
    await second.goto("/progress");
    await expect(second.getByRole("button", { name: "Open profile menu", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Open profile menu", exact: true }).click();
    await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
    await expect(second.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
    await second.getByLabel("Login ID", { exact: true }).fill(account.loginId);
    await second.getByLabel("Password", { exact: true }).fill(account.password);
    await second.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "What will you learn today?", exact: true })).toBeVisible();
    await expect(second.getByRole("heading", { name: "What will you learn today?", exact: true })).toBeVisible();
  } finally {
    await second.close();
  }
});

test("sign-out revokes the server session even if browser storage is blocked", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open profile menu", exact: true })).toBeEnabled();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Test storage failure", "QuotaExceededError"); };
  });
  await page.getByRole("button", { name: "Open profile menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You're signed out", exact: true })).toBeVisible();
  expect((await page.request.get("/api/auth/session")).status()).toBe(401);
});
