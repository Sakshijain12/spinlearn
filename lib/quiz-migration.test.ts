import { describe, expect, it } from "vitest";
import { alignQuizProgress, initialLessonProgress, quizMatches } from "./learning";
import type { LessonContent } from "./schemas/validation";

const questions: LessonContent["quiz"] = [
  { id: "final-a", question: "First final question", options: ["A", "B", "C"], correct_index: 1, explanation: "B is correct." },
  { id: "final-b", question: "Second final question", options: ["A", "B", "C"], correct_index: 2, explanation: "C is correct." },
];
const legacyIds = ["concept-check", "final-a", "final-b"];

describe("Concept-only question migration", () => {
  it("initializes a new attempt without inventing answers or completion", () => {
    const result = alignQuizProgress(initialLessonProgress(), questions, legacyIds);
    expect(result.quizQuestionIds).toEqual(["final-a", "final-b"]);
    expect(result.answers).toEqual([]);
    expect(result.score).toBeNull();
    expect(result.completedSteps).toEqual([]);
    expect(quizMatches(result, questions)).toBe(true);
    expect(quizMatches(undefined, questions)).toBe(false);
  });

  it("removes only the Concept answer and preserves practice, reading progress, and history", () => {
    const progress = {
      ...initialLessonProgress(),
      step: 4,
      visited: [0, 1, 2, 3, 4],
      completedSteps: [0, 1, 2, 3, 4],
      answers: [0, 1, 2],
      score: 1,
      completedAt: "2026-11-01T01:00:00.000Z",
      dueDate: "2026-11-08",
    };
    const result = alignQuizProgress(progress, questions, legacyIds);
    expect(result.answers).toEqual([1, 2]);
    expect(result.score).toBe(1);
    expect(result.completedSteps).toEqual(progress.completedSteps);
    expect(result.completedAt).toBe(progress.completedAt);
    expect(result.dueDate).toBe(progress.dueDate);
    expect(result.quickCheck).toEqual(progress.quickCheck);
    expect(result.visited).toEqual(progress.visited);
    expect(progress.answers).toEqual([0, 1, 2]);
  });

  it.each([
    { answers: [1, 1, 2], previousScore: 2 / 3, expectedScore: 1, passed: true },
    { answers: [0, 0, 0], previousScore: 1 / 3, expectedScore: 0, passed: false },
    { answers: [0, 1, 0], previousScore: 2 / 3, expectedScore: 0.5, passed: false },
  ])("rechecks only the remaining answers: $answers", ({ answers, previousScore, expectedScore, passed }) => {
    const progress = { ...initialLessonProgress(), answers, score: previousScore, completedSteps: [0, 1, 2, 3, 4] };
    const result = alignQuizProgress(progress, questions, legacyIds);
    expect(result.answers).toEqual(answers.slice(1));
    expect(result.score).toBe(expectedScore);
    expect(result.completedSteps.includes(4)).toBe(passed);
    expect(result.completedSteps.filter((step) => step !== 4)).toEqual([0, 1, 2, 3]);
  });

  it("does not grade an unchecked attempt during migration", () => {
    const progress = { ...initialLessonProgress(), answers: [0, 1, 2] };
    const result = alignQuizProgress(progress, questions, legacyIds);
    expect(result.answers).toEqual([1, 2]);
    expect(result.score).toBeNull();
    expect(result.completedSteps).not.toContain(4);
  });

  it("does not reset an already aligned attempt", () => {
    const progress = {
      ...initialLessonProgress(), quizQuestionIds: ["final-a", "final-b"], answers: [1, 2], score: 1,
    };
    expect(alignQuizProgress(progress, questions, legacyIds)).toBe(progress);
  });

  it("matches reordered answers by question ID, not their old position", () => {
    const progress = {
      ...initialLessonProgress(), quizQuestionIds: ["final-b", "final-a"], answers: [2, 1], score: 1,
    };
    const result = alignQuizProgress(progress, questions, legacyIds);
    expect(result.answers).toEqual([1, 2]);
    expect(result.score).toBe(1);
  });

  it("does not invent answers to an unknown question", () => {
    const progress = {
      ...initialLessonProgress(), quizQuestionIds: ["other", "final-a"], answers: [2, 1], score: 1,
      completedSteps: [0, 1, 2, 3, 4], completedAt: "2026-11-01T01:00:00.000Z",
    };
    const result = alignQuizProgress(progress, questions, legacyIds);
    expect(result.answers).toEqual([]);
    expect(result.score).toBeNull();
    expect(result.completedSteps).toEqual([0, 1, 2, 3]);
    expect(result.completedAt).toBe(progress.completedAt);
  });

  it("rejects an empty or ambiguously identified assessment", () => {
    expect(() => alignQuizProgress(initialLessonProgress(), [], legacyIds)).toThrow("uniquely identified");
    expect(() => alignQuizProgress(initialLessonProgress(), [questions[0], questions[0]], legacyIds)).toThrow("uniquely identified");
  });
});
