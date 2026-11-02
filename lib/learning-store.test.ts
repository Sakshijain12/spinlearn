import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testAuthDatabase } from "./auth/postgres-test-helper";
import { newSession } from "./auth/store";
import { LearningStore } from "./learning-store";
import { applyLearningAction, type LearningAction } from "./learning-actions";
import { initialLearningState, learningStats } from "./learning";
import { getLesson } from "./lessons";
import type { Account } from "./auth/validation";

describe("server-owned learning data", () => {
  let database: Awaited<ReturnType<typeof testAuthDatabase>>;
  let store: LearningStore;
  const account = async (): Promise<Account> => {
    const result = await database.store.register(`learner-${randomUUID()}`, "Learner", "test-hash", newSession());
    if (!result) throw new Error("Could not create test account");
    return result;
  };
  beforeAll(async () => { database = await testAuthDatabase(); store = new LearningStore(database.query); }, 30000);
  afterAll(async () => { await database?.db.close(); });
  const mutate = (owner: Account, action: LearningAction, expectedRevision?: number, requestId = randomUUID()) =>
    store.mutate(owner, { accountId: owner.id, requestId, action, expectedRevision });

  it("persists learning between independent store instances while keeping accounts isolated", async () => {
    const first = await account();
    const second = await account();
    const saved = await mutate(first, { type: "complete-step", slug: "lora", step: 0 });
    const anotherInstance = new LearningStore(database.query);
    expect(await anotherInstance.read(first)).toEqual(saved);
    expect((await anotherInstance.read(second)).state.progress).toEqual({});
    await expect(store.mutate(second, {
      accountId: first.id, requestId: randomUUID(), action: { type: "bookmark", slug: "lora", saved: true },
    })).rejects.toThrow("account changed");
  });

  it("reapplies concurrent mutations without losing a different lesson or bookmark", async () => {
    const owner = await account();
    const another = new LearningStore(database.query);
    await Promise.all([
      mutate(owner, { type: "complete-step", slug: "lora", step: 0 }),
      another.mutate(owner, { accountId: owner.id, requestId: randomUUID(), action: { type: "bookmark", slug: "kv-cache", saved: true } }),
    ]);
    const { state } = await store.read(owner);
    expect(state.progress.lora.completedSteps).toEqual([0]);
    expect(state.bookmarks).toEqual(["kv-cache"]);
  });

  it("grades quizzes on the server and records a completed attempt only once", async () => {
    const owner = await account();
    const lesson = getLesson("kv-cache")!;
    for (let step = 0; step < 4; step += 1) await mutate(owner, { type: "complete-step", slug: lesson.slug, step });
    const wrong = await mutate(owner, { type: "quiz", slug: lesson.slug, answers: [0, 0] });
    expect(wrong.state.progress[lesson.slug].score).toBe(0);
    await expect(mutate(owner, { type: "complete-lesson", slug: lesson.slug, seconds: 60 })).rejects.toThrow("correctly answer");
    const right = await mutate(owner, { type: "quiz", slug: lesson.slug, answers: lesson.quiz.map((question) => question.correct_index) });
    expect(right.state.progress[lesson.slug].score).toBe(1);
    const requestId = randomUUID();
    const completed = await mutate(owner, { type: "complete-lesson", slug: lesson.slug, seconds: 60 }, undefined, requestId);
    expect(completed.state.activity).toHaveLength(1);
    expect(await mutate(owner, { type: "complete-lesson", slug: lesson.slug, seconds: 60 }, undefined, requestId)).toEqual(completed);
    expect((await mutate(owner, { type: "complete-lesson", slug: lesson.slug, seconds: 60 })).state.activity).toHaveLength(1);
  });

  it("requires a fresh revision before destructive reset or restore", async () => {
    const owner = await account();
    const snapshot = await store.read(owner);
    await mutate(owner, { type: "bookmark", slug: "lora", saved: true });
    await expect(mutate(owner, { type: "restore", state: snapshot.state }, snapshot.revision)).rejects.toThrow("another device");
    await expect(mutate(owner, { type: "reset" }, snapshot.revision)).rejects.toThrow("another device");
    const latest = await store.read(owner);
    const reset = await mutate(owner, { type: "reset" }, latest.revision);
    expect(reset.state.bookmarks).toEqual([]);
    expect(reset.state.profile).toEqual(latest.state.profile);
  });

  it("imports old browser data only into an empty server record and leaves its history intact", async () => {
    const owner = await account();
    const legacy = initialLearningState();
    legacy.bookmarks = ["lora"];
    legacy.activity = [{ slug: "lora", date: "2026-11-01", correct: 1, total: 3, seconds: 300 }];
    const result = await mutate(owner, { type: "import-browser", state: legacy });
    expect(result.state).toEqual(legacy);
    expect(learningStats(result.state, "2026-11-01").accuracy).toBe(33);
    await expect(mutate(owner, { type: "import-browser", state: initialLearningState() })).rejects.toThrow("not overwritten");
  });

  it("shares the daily spin cap across instances", async () => {
    const owner = await account();
    const spin = { id: randomUUID(), date: "2020-01-01", slug: "lora", respinsUsed: 0 };
    const first = await mutate(owner, { type: "spin", spin });
    expect(first.state.spin?.date).not.toBe("2020-01-01");
    const second = await mutate(owner, { type: "spin", spin: { ...spin, slug: "kv-cache" } });
    expect(second.state.spin?.respinsUsed).toBe(1);
    await expect(mutate(owner, { type: "spin", spin })).rejects.toThrow("today's re-spin");
  });

  it("does not complete Quiz from the separate practice question", () => {
    const lesson = getLesson("red-teaming")!;
    const next = applyLearningAction(initialLearningState(), {
      type: "quick-check", slug: lesson.slug, answers: [lesson.steps.concept.quick_check.correct_index], checked: true,
    }, { requestId: randomUUID(), now: new Date("2026-11-02T00:00:00Z"), lesson });
    expect(next.progress[lesson.slug].quickCheck.score).toBe(1);
    expect(next.progress[lesson.slug].completedSteps).toEqual([]);
    expect(next.progress[lesson.slug].score).toBeNull();
  });
});
