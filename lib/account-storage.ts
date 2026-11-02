import { initialLearningState, learningStateSchema, STORAGE_KEY, type LearningState } from "./learning";
import type { Account } from "./auth/validation";

export const LEGACY_OWNER_KEY = "spinlearn.learning.owner.v1";
export const AUTH_EVENT_KEY = "spinlearn.auth.event.v1";

export function accountStorageKey(accountId: string): string {
  return `${STORAGE_KEY}:${accountId}`;
}

export function loadAccountLearning(storage: Storage, account: Account): LearningState {
  const key = accountStorageKey(account.id);
  const saved = storage.getItem(key);
  if (saved) return learningStateSchema.parse(JSON.parse(saved));

  let owner = storage.getItem(LEGACY_OWNER_KEY);
  if (!owner) {
    // Claim before copying: an interrupted import must not expose it to another account.
    storage.setItem(LEGACY_OWNER_KEY, account.id);
    owner = account.id;
  }
  const legacy = owner === account.id ? storage.getItem(STORAGE_KEY) : null;
  const next = legacy ? learningStateSchema.parse(JSON.parse(legacy)) : initialLearningState();
  next.previewEnded = false;
  if (!legacy) next.profile.displayName = account.displayName;
  storage.setItem(key, JSON.stringify(next));
  return next;
}

export function broadcastAccountChange(action: "login" | "logout") {
  try {
    localStorage.setItem(AUTH_EVENT_KEY, JSON.stringify({ action, timestamp: Date.now() }));
  } catch (error) {
    console.warn("The account session changed, but other tabs could not be notified. Refresh them to update their session.", error);
  }
}
