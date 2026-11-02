import { expect, test, type Page } from "./fixtures";
import { accountStorageKey } from "../lib/account-storage";
import { initialLearningState, STORAGE_KEY } from "../lib/learning";

function steps(page: Page) {
  return page.getByRole("navigation", { name: "Lesson steps", exact: true }).getByRole("button");
}

async function expectStep(page: Page, index: number, completed: boolean) {
  const button = steps(page).nth(index);
  await expect(button).toHaveAttribute("aria-label", completed ? /, completed$/ : /, not completed$/);
  await expect(button.locator(":scope > span").first()).toHaveCSS(
    "background-color",
    completed ? "rgb(44, 111, 209)" : "rgba(31, 30, 29, 0.12)"
  );
  await expect(button.locator("svg")).toHaveCount(completed ? 1 : 0);
}

for (const width of [1280, 390]) {
  test(`opening Quiz and returning to Math does not fill unfinished sections at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/lesson/red-teaming");
    await steps(page).nth(4).click();
    await expect(page.locator("#step-title")).toHaveText("Quiz");
    await expect(page.getByRole("button", { name: "Mark as learned", exact: true })).toBeDisabled();
    await steps(page).nth(2).click();
    await expect(steps(page).nth(2)).toHaveAttribute("aria-current", "step");
    for (let index = 0; index < 5; index += 1) await expectStep(page, index, false);

    await page.getByRole("button", { name: "Complete & next", exact: true }).click();
    await expect(steps(page).nth(3)).toHaveAttribute("aria-current", "step");
    await expectStep(page, 2, true);
    await expectStep(page, 3, false);
    await expectStep(page, 4, false);

    await page.getByRole("button", { name: width < 640 ? "Back" : "Math", exact: true }).click();
    await expect(steps(page).nth(2)).toHaveAttribute("aria-current", "step");
    await page.reload();
    await expect(steps(page).nth(2)).toHaveAttribute("aria-current", "step");
    for (let index = 0; index < 5; index += 1) await expectStep(page, index, index === 2);
    await expect(page.getByText(/^1 of 5 sections complete\./)).toBeVisible();

    await page.goto("/library?q=AI%20red%20teaming");
    await expect(page.locator("article")).toHaveCount(1);
    await expect(page.locator("article").getByText("In progress \u00b7 1/5", { exact: true })).toBeVisible();
  });
}

test("legacy visits and scores are retained but do not become section confirmations", async ({ page, account }) => {
  const completedAt = "2026-11-01T01:00:00.000Z";
  const legacy = {
    ...initialLearningState(),
    progress: {
      "red-teaming": {
        step: 2, visited: [0, 1, 2, 3, 4], answers: [0, 0, 0], score: 1 / 3,
        completedAt, dueDate: "2026-11-02",
      },
    },
  };
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key: STORAGE_KEY, state: legacy });
  await page.goto("/lesson/red-teaming");
  await expect(steps(page).nth(2)).toHaveAttribute("aria-current", "step");
  for (let index = 0; index < 5; index += 1) await expectStep(page, index, false);
  await expect(page.getByText("Your earlier lesson result is saved in Progress. Section confirmations are tracked separately.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Complete & next", exact: true }).click();
  await steps(page).nth(2).click();
  await page.reload();
  await expectStep(page, 2, true);
  await expectStep(page, 4, false);
  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error("Expected saved learning data");
    return JSON.parse(raw).progress["red-teaming"];
  }, accountStorageKey(account.id));
  expect(stored).toMatchObject({
    completedSteps: [2], visited: [0, 1, 2, 3, 4], score: 1 / 3, answers: [0, 0, 0], completedAt,
  });
});

test("a quick check does not complete the full Quiz section", async ({ page }) => {
  await page.goto("/lesson/red-teaming");
  await page.locator("main fieldset").getByRole("radio").nth(0).check();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 of 1 correct" })).toBeVisible();
  await expectStep(page, 4, false);
  await expectStep(page, 0, false);
  await steps(page).nth(4).click();
  await expect(page.getByRole("button", { name: "Mark as learned", exact: true })).toBeDisabled();
});

test("a perfect quiz alone does not complete skipped reading sections", async ({ page }) => {
  await page.goto("/lesson/red-teaming");
  await steps(page).nth(4).click();
  const questions = page.locator("main fieldset");
  for (let index = 0; index < 2; index += 1) await questions.nth(index).getByRole("radio").nth(index + 1).check();
  await page.getByRole("button", { name: "Check answers", exact: true }).click();
  await expectStep(page, 4, true);
  await expect(page.getByRole("button", { name: "Mark as learned", exact: true })).toBeDisabled();
  await steps(page).nth(2).click();
  await expect(steps(page).nth(2)).toHaveAttribute("aria-current", "step");
  await expectStep(page, 2, false);
  await expectStep(page, 4, true);
  await page.reload();
  await expectStep(page, 2, false);
  await expectStep(page, 4, true);
});

test("Quiz requires every correct answer and retry clears only its confirmation", async ({ page }) => {
  await page.goto("/lesson/kv-cache");
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole("button", { name: "Complete & next", exact: true }).click();
    await expectStep(page, index, true);
  }
  const markLearned = page.getByRole("button", { name: "Mark as learned", exact: true });
  await expect(markLearned).toBeDisabled();
  await page.getByRole("button", { name: "Check answers", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Choose an answer" })).toBeVisible();
  await expectStep(page, 4, false);

  const questions = page.locator("main fieldset");
  for (const [question, answer] of [1, 0].entries()) {
    await questions.nth(question).getByRole("radio").nth(answer).check();
  }
  await page.getByRole("button", { name: "Check answers", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 of 2 correct" })).toBeVisible();
  await expectStep(page, 4, false);
  await expect(markLearned).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: "1 of 2 correct" })).toBeVisible();
  await expectStep(page, 4, false);
  await expect(markLearned).toBeDisabled();

  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await questions.nth(1).getByRole("radio").nth(1).check();
  await page.getByRole("button", { name: "Check answers", exact: true }).click();
  await expectStep(page, 4, true);
  await expect(markLearned).toBeEnabled();
  await markLearned.click();
  await expect(page.getByRole("heading", { name: "One more idea, understood", exact: true })).toBeVisible();

  await page.goto("/lesson/kv-cache");
  for (let index = 0; index < 5; index += 1) await expectStep(page, index, true);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expectStep(page, 4, false);
  await expect(markLearned).toBeDisabled();
  await steps(page).nth(2).click();
  for (let index = 0; index < 5; index += 1) await expectStep(page, index, index < 4);
  await expect(steps(page).nth(2)).toHaveAttribute("aria-current", "step");
});

for (const width of [1280, 390]) {
  test(`Back and Complete & next start each section at the top at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 600 });
    await page.emulateMedia({ reducedMotion: width < 768 ? "reduce" : "no-preference" });
    await page.goto("/lesson/red-teaming");

    for (let index = 0; index < 4; index += 1) {
      const next = page.getByRole("button", { name: "Complete & next", exact: true });
      await next.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
      await next.click();
      await expect(steps(page).nth(index + 1)).toHaveAttribute("aria-current", "step");
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await expect(page.getByRole("heading", { name: "AI red teaming", level: 1, exact: true })).toBeInViewport();
      await expectStep(page, index, true);
    }

    await expect(page.getByRole("button", { name: "Mark as learned", exact: true })).toBeDisabled();
    for (const [index, section] of ["Code", "Math", "Intuition", "Concept"].entries()) {
      const back = page.getByRole("button", { name: width < 640 ? "Back" : section, exact: true });
      await back.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
      await back.click();
      await expect(steps(page).nth(3 - index)).toHaveAttribute("aria-current", "step");
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await expect(page.getByRole("heading", { name: "AI red teaming", level: 1, exact: true })).toBeInViewport();
      await expect(page.getByText(/^4 of 5 sections complete\./)).toBeVisible();
    }
    await expectStep(page, 4, false);

    const practice = page.getByRole("region", { name: "Quick check", exact: true });
    const check = practice.getByRole("button", { name: "Check answer", exact: true });
    await practice.getByRole("radio").first().check();
    await check.scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
    await check.click();
    await expect(practice.getByRole("status")).toHaveText("1 of 1 correct");
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  });
}
