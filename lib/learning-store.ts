import { z } from "zod";
import { getDatabaseQuery, type DatabaseQuery } from "./db/query";
import { initialLearningState, learningStateSchema } from "./learning";
import { applyLearningAction, LearningActionError, type LearningMutation, type LearningSnapshot } from "./learning-actions";
import { getLesson } from "./lessons";
import { SAMPLE_TOPICS } from "./data";
import type { Account } from "./auth/validation";

const rowSchema = z.object({
  payload: learningStateSchema,
  revision: z.number().int().positive(),
  mutation_ids: z.array(z.string().uuid()),
});

export class LearningStore {
  constructor(private readonly query: DatabaseQuery) {}

  private async row(accountId: string) {
    const [row] = await this.query("SELECT payload, revision, mutation_ids FROM spinlearn_auth.learning_state WHERE account_id = $1", [accountId]);
    return row ? rowSchema.parse(row) : null;
  }

  async read(account: Account): Promise<LearningSnapshot> {
    const row = await this.row(account.id);
    const initial = initialLearningState();
    initial.profile.displayName = account.displayName;
    return { accountId: account.id, state: row?.payload ?? initial, revision: row?.revision ?? 0 };
  }

  async mutate(account: Account, mutation: LearningMutation): Promise<LearningSnapshot> {
    const { action, requestId, expectedRevision } = mutation;
    if (mutation.accountId !== account.id) throw new LearningActionError("Your signed-in account changed. Reload before saving.", 409);
    const topicSlug = "slug" in action ? action.slug : action.type === "spin" ? action.spin.slug : undefined;
    if (topicSlug && !SAMPLE_TOPICS.some((topic) => topic.slug === topicSlug)) {
      throw new LearningActionError("This topic is not in the catalogue.", 404);
    }
    const lesson = topicSlug ? getLesson(topicSlug) : undefined;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const current = await this.row(account.id);
      if (current?.mutation_ids.includes(requestId)) return { accountId: account.id, state: current.payload, revision: current.revision };
      const revision = current?.revision ?? 0;
      if (action.type === "import-browser" && revision !== 0) {
        throw new LearningActionError("Server progress already exists. It was not overwritten. Use a confirmed backup import in Settings if needed.", 409);
      }
      if ((action.type === "restore" || action.type === "reset") && expectedRevision !== revision) {
        throw new LearningActionError("Your progress changed on another device. Reload before replacing or resetting it.", 409);
      }
      const initial = initialLearningState();
      initial.profile.displayName = account.displayName;
      const previous = current?.payload ?? initial;
      const state = applyLearningAction(previous, action, { requestId, now: new Date(), lesson });
      if (current && state === previous) return { accountId: account.id, state, revision };
      const ids = [...(current?.mutation_ids ?? []).slice(-99), requestId];
      const [saved] = await this.query(`
        INSERT INTO spinlearn_auth.learning_state AS learning
          (account_id, payload, revision, mutation_ids, updated_at)
        VALUES ($1, $2::jsonb, 1, $3::jsonb, $4)
        ON CONFLICT (account_id) DO UPDATE SET
          payload = EXCLUDED.payload, revision = learning.revision + 1,
          mutation_ids = EXCLUDED.mutation_ids, updated_at = EXCLUDED.updated_at
        WHERE learning.revision = $5
        RETURNING payload, revision, mutation_ids
      `, [account.id, JSON.stringify(state), JSON.stringify(ids), Date.now(), revision]);
      if (saved) {
        const result = rowSchema.parse(saved);
        return { accountId: account.id, state: result.payload, revision: result.revision };
      }
    }
    throw new LearningActionError("Progress changed several times while saving. Please try your action again.", 409);
  }
}

let store: LearningStore | undefined;
export function getLearningStore(): LearningStore {
  if (!store) store = new LearningStore(getDatabaseQuery());
  return store;
}
