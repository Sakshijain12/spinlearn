import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createLearningBackup, validateLearningBackup } from "./learning-backup";
import { initialLearningState, initialLessonProgress } from "./learning";

describe("deployment learning-data backups", () => {
  it("round-trips progress, bookmarks, preferences, and practice answers for the same account", () => {
    const accountId = randomUUID();
    const state = initialLearningState();
    state.profile.displayName = "My learner";
    state.bookmarks = ["lora"];
    state.progress["lora"] = { ...initialLessonProgress(), step: 2, completedSteps: [0, 1], quickCheck: { answers: [0], score: 1 } };
    const backup = createLearningBackup(accountId, state);
    const parsed = validateLearningBackup(JSON.parse(JSON.stringify(backup)), accountId);
    expect(parsed.state).toEqual(state);
    expect(Object.keys(parsed).sort()).toEqual(["accountId", "exportedAt", "format", "state"]);
  });

  it("rejects a different account or corrupted data instead of silently overwriting it", () => {
    const accountId = randomUUID();
    const backup = createLearningBackup(accountId, initialLearningState());
    expect(() => validateLearningBackup(backup, randomUUID())).toThrow("different account");
    expect(() => validateLearningBackup({ ...backup, format: "other" }, accountId)).toThrow("not a valid");
    expect(() => validateLearningBackup({ ...backup, state: {} }, accountId)).toThrow("not a valid");
  });

  it("does not serialize fields outside the learning-state contract", () => {
    const accountId = randomUUID();
    const state = { ...initialLearningState(), secret: "not-learning-data" };
    expect(JSON.stringify(createLearningBackup(accountId, state))).not.toContain("not-learning-data");
  });
});
