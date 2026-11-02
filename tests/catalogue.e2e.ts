import { expect, test } from "./fixtures";
import { SAMPLE_TOPICS } from "../lib/data";
import { AVAILABLE_LESSONS, getGlossary } from "../lib/lessons";
import { CATEGORIES, LEVELS } from "../lib/learning";
import { lessonContentSchema, spinResponseSchema } from "../lib/schemas/validation";

test("all 42 lesson APIs provide distinct complete content and glossary definitions", async ({ request }) => {
  for (const lesson of AVAILABLE_LESSONS) {
    const response = await request.get(`/api/v1/lessons/${lesson.slug}`);
    expect(response.status(), lesson.slug).toBe(200);
    const result = await response.json();
    expect(result.lesson_id).toBe(`lesson-${lesson.slug}`);
    expect(lessonContentSchema.parse(result.content)).toEqual(lesson);
    expect(result.glossary).toEqual(getGlossary(lesson.slug));
  }
  const missing = await request.get("/api/v1/lessons/not-a-topic");
  expect(missing.status()).toBe(404);
  expect((await missing.json()).error.code).toBe("NOT_FOUND");
});

test("every category and level uses its real pool and re-spins avoid the previous topic", async ({ request }) => {
  for (const category of CATEGORIES) {
    for (const level of LEVELS) {
      const pool = SAMPLE_TOPICS.filter((topic) => (category === "All" || topic.category === category) && (level === "All" || topic.level === level));
      const response = await request.post("/api/v1/spin", { data: { category, level } });
      if (!pool.length) {
        expect(response.status(), `${category}/${level}`).toBe(422);
        expect((await response.json()).error.code).toBe("EMPTY_POOL");
        continue;
      }
      expect(response.status(), `${category}/${level}`).toBe(201);
      const result = spinResponseSchema.parse(await response.json());
      expect(result.spin.pool_size).toBe(pool.length);
      expect(pool.map((topic) => topic.slug)).toContain(result.spin.topic.slug);
      for (const name of result.reel.options) expect(pool.map((topic) => topic.name)).toContain(name);
      if (pool.length > 1) {
        expect(new Set(result.reel.options).size).toBeGreaterThan(1);
        const next = await request.post("/api/v1/spin", { data: { category, level, respin: true, exclude_slug: result.spin.topic.slug } });
        expect(next.status()).toBe(201);
        const rerolled = spinResponseSchema.parse(await next.json());
        expect(rerolled.spin.topic.slug).not.toBe(result.spin.topic.slug);
        expect(rerolled.spin.respins_left).toBe(0);
      }
    }
  }
});

test("the library paginates all 42 topics and filters across all seven areas", async ({ page, request }) => {
  await page.goto("/library");
  await expect(page.getByText("42 topics to explore", { exact: true })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(20);
  await page.getByRole("button", { name: "Show more topics", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(40);
  await page.getByRole("button", { name: "Show more topics", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(42);
  await expect(page.getByRole("button", { name: "Show more topics", exact: true })).toHaveCount(0);
  for (const category of CATEGORIES.filter((value) => value !== "All")) {
    await page.getByRole("group", { name: "Category", exact: true }).getByRole("button", { name: category, exact: true }).click();
    await expect(page.locator("article")).toHaveCount(SAMPLE_TOPICS.filter((topic) => topic.category === category).length);
  }

  const slugs: string[] = [];
  let cursor: string | null = null;
  do {
    const response = await request.get(`/api/v1/topics?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    expect(response.status()).toBe(200);
    const body: { total: number; items: { slug: string }[]; next_cursor: string | null } = await response.json();
    expect(body.total).toBe(42);
    slugs.push(...body.items.map((item: { slug: string }) => item.slug));
    cursor = body.next_cursor;
  } while (cursor);
  expect(new Set(slugs).size).toBe(42);
  expect(slugs.sort()).toEqual(SAMPLE_TOPICS.map((topic) => topic.slug).sort());
});

test("every lesson renders all five topic-specific steps without browser errors or overflow", async ({ page }) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (let index = 0; index < AVAILABLE_LESSONS.length; index += 1) {
    const lesson = AVAILABLE_LESSONS[index];
    await page.setViewportSize({ width: index % 2 ? 390 : 1280, height: 900 });
    await page.goto(`/lesson/${lesson.slug}`);
    await expect(page.getByRole("heading", { name: lesson.title, exact: true, level: 1 })).toBeVisible();
    await expect(page.getByText(lesson.steps.concept.body, { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Quick check", exact: true }).locator("legend")).toHaveText(lesson.steps.concept.quick_check.question);
    await page.getByRole("button", { name: "Complete & next", exact: true }).click();
    await expect(page.getByText(lesson.steps.intuition.body, { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Quick check", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Complete & next", exact: true }).click();
    await expect(page.locator(".katex")).toHaveCount(lesson.steps.math.formulas.length);
    await expect(page.getByText(lesson.steps.math.worked_example!, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), lesson.slug).toBe(true);
    await page.getByRole("button", { name: "Complete & next", exact: true }).click();
    await expect(page.locator("pre code")).toHaveText(lesson.steps.code.snippet);
    await page.getByRole("button", { name: lesson.key_terms[0], exact: true }).click();
    await expect(page.locator("#term-explanation")).toContainText(getGlossary(lesson.slug)[lesson.key_terms[0]]);
    await page.getByRole("button", { name: "Complete & next", exact: true }).click();
    const questions = page.locator("main fieldset");
    await expect(questions).toHaveCount(lesson.quiz.length);
    await expect(page.getByText(lesson.steps.concept.quick_check.question, { exact: true })).toHaveCount(0);
    for (let question = 0; question < lesson.quiz.length; question += 1) {
      await questions.nth(question).getByRole("radio").nth(lesson.quiz[question].correct_index).check();
    }
    await page.getByRole("button", { name: "Check answers", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: `${lesson.quiz.length} of ${lesson.quiz.length} correct` })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark as learned", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Mark as learned", exact: true }).click();
    await expect(page.getByRole("heading", { name: "One more idea, understood", exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
  await page.goto("/progress");
  await expect(page.locator(".metric-card").filter({ hasText: "Topics learned" }).locator("dd")).toHaveText("42");
  await expect(page.locator(".metric-card").filter({ hasText: "Quiz accuracy" }).locator("dd")).toHaveText("100%");
});
