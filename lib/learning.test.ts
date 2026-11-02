import { describe, expect, it } from "vitest";
import { activityDays, canCompleteLesson, completedStepCount, initialLearningState, initialLessonProgress, latestQuizScore, learningStateSchema, learningStats, offsetDay, profileSchema, quickCheckSchema, topicStatus } from "./learning";

describe("local learning state", () => {
  it("starts without fabricated progress", () => {
    expect(learningStats(initialLearningState(), "2026-10-31")).toEqual({
      learned: 0, streak: 0, accuracy: null, weeklyMinutes: 0,
    });
  });

  describe("individual section completion", () => {
    it("does not treat visits, the current section, or an earlier result as confirmations", () => {
      const progress = {
        ...initialLessonProgress(),
        step: 2,
        visited: [0, 1, 2, 3, 4],
        completedAt: "2026-11-01T01:00:00.000Z",
        answers: [0, 1, 1],
        score: 1,
      };
      expect(completedStepCount(progress)).toBe(0);
      expect(canCompleteLesson(progress, 3)).toBe(false);
    });

    it.each([null, "2026-11-01T01:00:00.000Z"])(
      "loads legacy progress without inventing section confirmations (%s)",
      (completedAt) => {
        const legacyProgress = {
          step: 2, visited: [0, 1, 2, 3, 4], answers: [0, 0, 0],
          score: 1 / 3, completedAt, dueDate: completedAt ? "2026-11-02" : null,
        };
        const state = {
          ...initialLearningState(),
          bookmarks: ["red-teaming"],
          progress: { "red-teaming": legacyProgress },
          activity: [{ slug: "red-teaming", date: "2026-11-01", correct: 1, total: 3, seconds: 60 }],
        };
        const restored = learningStateSchema.parse(state);
        expect(restored.progress["red-teaming"]).toEqual({
          ...legacyProgress, completedSteps: [], quizQuestionIds: [], quickCheck: { answers: [], score: null },
        });
        expect(restored.activity).toEqual(state.activity);
        expect(restored.bookmarks).toEqual(state.bookmarks);
      }
    );

    it("counts actual distinct section confirmations rather than array length", () => {
      const progress = { ...initialLessonProgress(), completedSteps: [0, 0, 2, 2, 4] };
      expect(completedStepCount(progress)).toBe(3);
      expect(completedStepCount(undefined)).toBe(0);
      expect(canCompleteLesson({ ...progress, score: 1, answers: [0, 1, 1] }, 3)).toBe(false);
    });

    it.each([null, 0, 1 / 3, 2 / 3, 0.8, 0.99])(
      "does not allow lesson completion with score %s",
      (score) => {
        const progress = { ...initialLessonProgress(), completedSteps: [0, 1, 2, 3, 4], answers: [0, 1, 1], score };
        expect(canCompleteLesson(progress, 3)).toBe(false);
      }
    );

    it("requires all reading sections and a complete perfect quiz attempt", () => {
      const progress = { ...initialLessonProgress(), completedSteps: [0, 1, 2, 3, 4], answers: [0, 1, 1], score: 1 };
      expect(canCompleteLesson(progress, 3)).toBe(true);
      expect(canCompleteLesson({ ...progress, completedSteps: [4] }, 3)).toBe(false);
      expect(canCompleteLesson({ ...progress, completedSteps: [0, 1, 2, 3] }, 3)).toBe(false);
      expect(canCompleteLesson({ ...progress, answers: [0, 1] }, 3)).toBe(false);
      expect(canCompleteLesson(progress, 0)).toBe(false);
      expect(canCompleteLesson(undefined, 3)).toBe(false);
    });

    it("preserves explicit confirmations when reading current-format saved data", () => {
      const progress = { ...initialLessonProgress(), step: 2, visited: [0, 1, 2, 3, 4], completedSteps: [0, 2] };
      const restored = learningStateSchema.parse({ ...initialLearningState(), progress: { "red-teaming": progress } });
      expect(restored.progress["red-teaming"]).toEqual(progress);
    });
  });

  it("validates stored data and profile timezones", () => {
    expect(learningStateSchema.safeParse(initialLearningState()).success).toBe(true);
    expect(profileSchema.safeParse({ displayName: "Taylor", timezone: "Asia/Tokyo" }).success).toBe(true);
    expect(profileSchema.safeParse({ displayName: "  ", timezone: "UTC" }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: "Taylor", timezone: "Not/A_Timezone" }).success).toBe(false);
    expect(learningStateSchema.safeParse({ version: 0 }).success).toBe(false);
  });

  it("counts consecutive active days without losing a streak before today's lesson", () => {
    const state = initialLearningState();
    state.activity = ["2026-10-30", "2026-10-29", "2026-10-27"].map((date) => ({ date, slug: "kv-cache", correct: 3, total: 3, seconds: 60 }));
    expect(learningStats(state, "2026-10-31").streak).toBe(2);
    state.activity.push({ date: "2026-10-31", slug: "self-attention", correct: 3, total: 3, seconds: 60 });
    expect(learningStats(state, "2026-10-31").streak).toBe(3);
    expect(learningStats(state, "2026-11-02").streak).toBe(0);
  });

  it("limits accuracy to the last thirty local dates and caps daily lesson time", () => {
    const state = initialLearningState();
    state.activity = [
      { date: "2026-10-01", slug: "kv-cache", correct: 3, total: 3, seconds: 60 },
      { date: "2026-10-31", slug: "kv-cache", correct: 2, total: 3, seconds: 1500 },
      { date: "2026-10-31", slug: "kv-cache", correct: 2, total: 3, seconds: 1500 },
      { date: "2026-10-31", slug: "self-attention", correct: 2, total: 3, seconds: 120 },
    ];
    const stats = learningStats(state, "2026-10-31");
    expect(stats.accuracy).toBe(67);
    expect(stats.weeklyMinutes).toBe(32);
  });

  it("renders exactly eighty-four days and counts unique completed topics", () => {
    const state = initialLearningState();
    state.activity = [
      { date: "2026-10-31", slug: "kv-cache", correct: 3, total: 3, seconds: 60 },
      { date: "2026-10-31", slug: "kv-cache", correct: 3, total: 3, seconds: 60 },
      { date: "2026-10-31", slug: "self-attention", correct: 2, total: 3, seconds: 60 },
    ];
    const days = activityDays(state, "2026-10-31");
    expect(days).toHaveLength(84);
    expect(days[0].date).toBe(offsetDay("2026-10-31", -83));
    expect(days[83]).toEqual({ date: "2026-10-31", count: 2 });
  });

  it("distinguishes new, in-progress, learned, and due topics", () => {
    const progress = initialLessonProgress();
    expect(topicStatus(undefined, "2026-10-31")).toBe("new");
    progress.visited = [0];
    expect(topicStatus(progress, "2026-10-31")).toBe("in_progress");
    progress.completedAt = "2026-10-30T10:00:00.000Z";
    progress.dueDate = "2026-11-01";
    expect(topicStatus(progress, "2026-10-31")).toBe("learned");
    expect(topicStatus(progress, "2026-11-01")).toBe("review_due");
  });

  it("uses calendar dates rather than local DST offsets", () => {
    expect(offsetDay("2026-10-31", 1)).toBe("2026-11-01");
    expect(offsetDay("2024-02-28", 1)).toBe("2024-02-29");
    expect(offsetDay("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("retains a completed score while a learner retries an unchecked quiz", () => {
    const state = initialLearningState();
    state.progress["kv-cache"] = { ...initialLessonProgress(), completedAt: "2026-10-31T10:00:00.000Z" };
    state.activity = [{ date: "2026-10-31", slug: "kv-cache", correct: 3, total: 3, seconds: 60 }];
    expect(latestQuizScore(state, "kv-cache")).toBe(1);
    state.progress["kv-cache"].score = 1 / 3;
    expect(latestQuizScore(state, "kv-cache")).toBe(1 / 3);
    expect(latestQuizScore(state, "unknown")).toBeNull();
  });
});

describe("saved Quick checks", () => {
  it.each([null, 0, 1])("round-trips a selected answer and score %s separately from the full quiz", (score) => {
    const quickCheck = quickCheckSchema.parse({ answers: [1], score });
    const progress = {
      ...initialLessonProgress(),
      step: 2,
      completedSteps: [0, 1, 2, 3],
      answers: [0, 1, 0],
      score: 2 / 3,
      quickCheck,
    };
    const state = { ...initialLearningState(), progress: { "red-teaming": progress } };
    const restored = learningStateSchema.parse(JSON.parse(JSON.stringify(state)));
    expect(restored.progress["red-teaming"]).toEqual(progress);
    expect(canCompleteLesson(restored.progress["red-teaming"], 3)).toBe(false);
    expect(completedStepCount(restored.progress["red-teaming"])).toBe(4);
  });

  it("keeps each lesson's practice state independent", () => {
    const first = { ...initialLessonProgress(), quickCheck: quickCheckSchema.parse({ answers: [0], score: 1 }) };
    const second = initialLessonProgress();
    const state = learningStateSchema.parse({
      ...initialLearningState(), progress: { "red-teaming": first, "kv-cache": second },
    });
    expect(state.progress["red-teaming"].quickCheck).toEqual({ answers: [0], score: 1 });
    expect(state.progress["kv-cache"].quickCheck).toEqual({ answers: [], score: null });
    expect(state.progress["red-teaming"].answers).toEqual([]);
    expect(state.progress["red-teaming"].completedSteps).toEqual([]);
  });

  it.each([
    { answers: [], score: 1 },
    { answers: [0, 1], score: 1 },
    { answers: [4], score: null },
    { answers: [0], score: 0.5 },
  ])("rejects invalid practice state instead of accepting an unusable result (%j)", (value) => {
    expect(quickCheckSchema.safeParse(value).success).toBe(false);
  });
});
