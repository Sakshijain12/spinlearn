import { describe, expect, it } from "vitest";
import { initialLearningState, initialLessonProgress, learningStateSchema } from "./learning";

describe("local preview session", () => {
  it("keeps older local profiles active without changing their saved data", () => {
    const current = initialLearningState();
    const { previewEnded, ...legacy } = current;
    expect(previewEnded).toBe(false);
    expect(learningStateSchema.parse(legacy)).toEqual(current);
  });

  it("persists preview exit independently of profile, bookmarks, and progress", () => {
    const state = initialLearningState();
    state.profile = { displayName: "Taylor Lee", timezone: "Asia/Tokyo" };
    state.bookmarks = ["kv-cache"];
    state.progress["kv-cache"] = { ...initialLessonProgress(), step: 2, visited: [0, 1, 2], completedSteps: [0, 1] };
    const signedOut = learningStateSchema.parse(JSON.parse(JSON.stringify({ ...state, previewEnded: true })));
    expect(signedOut.previewEnded).toBe(true);
    expect({ ...signedOut, previewEnded: false }).toEqual(state);
  });

  it("rejects an invalid preview state instead of guessing its meaning", () => {
    expect(learningStateSchema.safeParse({ ...initialLearningState(), previewEnded: "yes" }).success).toBe(false);
  });
});
