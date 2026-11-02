import { describe, expect, it } from "vitest";
import { accountStorageKey, LEGACY_OWNER_KEY, loadAccountLearning } from "./account-storage";
import { initialLearningState, initialLessonProgress, STORAGE_KEY } from "./learning";

class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  get length() { return this.items.size; }
  clear() { this.items.clear(); }
  getItem(key: string) { return this.items.get(key) ?? null; }
  key(index: number) { return [...this.items.keys()][index] ?? null; }
  removeItem(key: string) { this.items.delete(key); }
  setItem(key: string, value: string) { this.items.set(key, value); }
}

const first = { id: "first-account", loginId: "first", displayName: "First" };
const second = { id: "second-account", loginId: "second", displayName: "Second" };

describe("account-scoped local learning", () => {
  it("imports preview data for only the first account and leaves the original intact", () => {
    const storage = new MemoryStorage();
    const legacy = initialLearningState();
    legacy.previewEnded = true;
    legacy.profile.displayName = "Existing learner";
    legacy.bookmarks = ["kv-cache"];
    legacy.progress["kv-cache"] = { ...initialLessonProgress(), step: 2, completedSteps: [0, 1] };
    const original = JSON.stringify(legacy);
    storage.setItem(STORAGE_KEY, original);
    const imported = loadAccountLearning(storage, first);
    expect(imported).toEqual({ ...legacy, previewEnded: false });
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
    expect(storage.getItem(LEGACY_OWNER_KEY)).toBe(first.id);
    const other = loadAccountLearning(storage, second);
    expect(other.bookmarks).toEqual([]);
    expect(other.progress).toEqual({});
    expect(other.profile.displayName).toBe("Second");
    expect(loadAccountLearning(storage, first)).toEqual(imported);
  });

  it("does not re-import legacy progress after an account reset", () => {
    const storage = new MemoryStorage();
    const legacy = { ...initialLearningState(), bookmarks: ["kv-cache"] };
    storage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    loadAccountLearning(storage, first);
    storage.setItem(accountStorageKey(first.id), JSON.stringify(initialLearningState()));
    expect(loadAccountLearning(storage, first).bookmarks).toEqual([]);
  });

  it("reports unreadable data and reserves its ownership for the same account", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{invalid");
    expect(() => loadAccountLearning(storage, first)).toThrow();
    expect(storage.getItem(LEGACY_OWNER_KEY)).toBe(first.id);
    expect(loadAccountLearning(storage, second).bookmarks).toEqual([]);
  });
});
