import { expect, test, type Page } from "./fixtures";
import { accountStorageKey } from "../lib/account-storage";
import { initialLearningState, STORAGE_KEY } from "../lib/learning";

function quickCheck(page: Page) {
  return page.locator("section").filter({ has: page.getByRole("heading", { name: "Quick check", exact: true }) });
}

function steps(page: Page) {
  return page.getByRole("navigation", { name: "Lesson steps", exact: true }).getByRole("button");
}

for (const width of [1280, 390]) {
  test(`Quick check appears only in Concept and restores its answer at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/lesson/red-teaming");
    const practice = quickCheck(page);
    await practice.getByRole("radio").nth(0).check();
    await practice.getByRole("button", { name: "Check answer", exact: true }).click();
    await expect(practice.getByRole("status")).toHaveText("1 of 1 correct");
    const practiceQuestion = await practice.locator("legend").innerText();

    for (let index = 0; index < 4; index += 1) {
      await page.getByRole("button", { name: "Complete & next", exact: true }).click();
      await expect(practice).toHaveCount(0);
      await expect(page.getByText(practiceQuestion, { exact: true })).toHaveCount(0);
    }
    await expect(page.locator("#step-title")).toHaveText("Quiz");
    await expect(practice).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mark as learned", exact: true })).toBeDisabled();
    await expect(page.getByText(/^4 of 5 sections complete\./)).toBeVisible();

    for (const section of ["Code", "Math", "Intuition", "Concept"]) {
      await page.getByRole("button", { name: width < 640 ? "Back" : section, exact: true }).click();
      await expect(page.locator("#step-title")).toHaveText(section);
      if (section === "Concept") {
        await expect(practice).toBeVisible();
        await expect(practice.getByRole("radio").nth(0)).toBeChecked();
        await expect(practice.getByRole("status")).toHaveText("1 of 1 correct");
        await expect(practice.getByText("That's right.", { exact: true })).toBeVisible();
      } else {
        await expect(practice).toHaveCount(0);
      }
    }
    await page.reload();
    await expect(practice.getByRole("radio").nth(0)).toBeChecked();
    await expect(practice.getByRole("status")).toHaveText("1 of 1 correct");
    await expect(steps(page).nth(4)).toHaveAttribute("aria-label", /, not completed$/);
    await expect(page.getByText(/^4 of 5 sections complete\./)).toBeVisible();
  });
}

test("Quick check retains an unchecked selection when navigating away or reloading", async ({ page }) => {
  await page.goto("/lesson/red-teaming");
  const practice = quickCheck(page);
  await practice.getByRole("radio").nth(1).check();
  await steps(page).nth(4).click();
  await page.getByRole("button", { name: "Code", exact: true }).click();
  await expect(practice).toHaveCount(0);
  await steps(page).nth(0).click();
  await expect(practice.getByRole("radio").nth(1)).toBeChecked();
  await expect(practice.getByRole("radio").nth(1)).toBeEnabled();
  await expect(practice.getByRole("status")).toBeEmpty();
  await page.reload();
  await expect(practice.getByRole("radio").nth(1)).toBeChecked();
  await expect(practice.getByRole("status")).toBeEmpty();
  await expect(practice.getByRole("button", { name: "Check answer", exact: true })).toBeVisible();
});

test("Quick check preserves incorrect feedback and retry state without leaking between lessons", async ({ page }) => {
  await page.goto("/lesson/red-teaming");
  const practice = quickCheck(page);
  await practice.getByRole("radio").nth(1).check();
  await practice.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(practice.getByRole("status")).toHaveText("0 of 1 correct");
  await steps(page).nth(4).click();
  await steps(page).nth(0).click();
  await expect(practice.getByRole("status")).toHaveText("0 of 1 correct");
  await page.reload();
  await expect(practice.getByRole("radio").nth(1)).toBeChecked();
  await expect(practice.getByText("Not quite. Here's why.", { exact: true })).toBeVisible();
  await practice.getByRole("button", { name: "Try again", exact: true }).click();
  await page.reload();
  await expect(practice.getByRole("radio").nth(1)).toBeChecked();
  await expect(practice.getByRole("radio").nth(1)).toBeEnabled();
  await expect(practice.getByRole("status")).toBeEmpty();
  await practice.getByRole("radio").nth(0).check();
  await practice.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(practice.getByRole("status")).toHaveText("1 of 1 correct");

  await page.goto("/lesson/kv-cache");
  await expect(practice.getByRole("radio").first()).toBeEnabled();
  await expect(practice.locator('input[type="radio"]:checked')).toHaveCount(0);
  await expect(practice.getByRole("status")).toBeEmpty();
  await page.goBack();
  await expect(practice.getByRole("radio").nth(0)).toBeChecked();
  await expect(practice.getByRole("status")).toHaveText("1 of 1 correct");
});

test("Quick check and the full Quiz keep separate answers, results, and retry behavior", async ({ page, account }) => {
  await page.goto("/lesson/red-teaming");
  await steps(page).nth(4).click();
  const questions = page.locator("main fieldset");
  for (let index = 0; index < 2; index += 1) await questions.nth(index).getByRole("radio").nth(index + 1).check();
  await page.getByRole("button", { name: "Check answers", exact: true }).click();
  await expect(steps(page).nth(4)).toHaveAttribute("aria-label", /, completed$/);
  await steps(page).nth(0).click();
  const practice = quickCheck(page);
  await practice.getByRole("radio").nth(1).check();
  await practice.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(practice.getByRole("status")).toHaveText("0 of 1 correct");
  await practice.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(steps(page).nth(4)).toHaveAttribute("aria-label", /, completed$/);

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error("Expected persisted progress");
    return JSON.parse(raw).progress["red-teaming"];
  }, accountStorageKey(account.id));
  expect(stored).toMatchObject({
    answers: [1, 2], score: 1, completedSteps: [4],
    quickCheck: { answers: [1], score: null },
  });

  await steps(page).nth(4).click();
  await expect(page.getByRole("status").filter({ hasText: "2 of 2 correct" })).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await steps(page).nth(0).click();
  await expect(practice.getByRole("radio").nth(1)).toBeChecked();
  await expect(practice.getByRole("status")).toBeEmpty();
  await expect(steps(page).nth(4)).toHaveAttribute("aria-label", /, not completed$/);
});

test("existing final-Quiz answers are retained without repeating the Concept question", async ({ page, account }) => {
  const previous = {
    ...initialLearningState(),
    progress: {
      "red-teaming": {
        step: 4, visited: [0, 1, 2, 3, 4], completedSteps: [0, 1, 2, 3],
        answers: [0, 1, 0], score: 2 / 3, quickCheck: { answers: [0], score: 1 },
        completedAt: "2026-11-01T01:00:00.000Z", dueDate: "2026-11-02",
      },
    },
    activity: [{ slug: "red-teaming", date: "2026-11-01", correct: 2, total: 3, seconds: 120 }],
  };
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key: STORAGE_KEY, state: previous });
  await page.goto("/lesson/red-teaming");
  await expect(page.locator("main fieldset")).toHaveCount(2);
  await expect(page.getByRole("status").filter({ hasText: "1 of 2 correct" })).toBeVisible();
  await expect(page.getByText("What should be established before testing a deployed system?", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mark as learned", exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: "1 of 2 correct" })).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error("Expected persisted progress");
    return JSON.parse(raw);
  }, accountStorageKey(account.id));
  expect(stored.progress["red-teaming"]).toMatchObject({
    answers: [1, 0], quizQuestionIds: ["red-2", "red-3"], score: 0.5,
    completedSteps: [0, 1, 2, 3], quickCheck: { answers: [0], score: 1 },
    completedAt: previous.progress["red-teaming"].completedAt,
  });
  expect(stored.activity).toEqual(previous.activity);
  await steps(page).nth(0).click();
  await expect(quickCheck(page).getByRole("status")).toHaveText("1 of 1 correct");
});
