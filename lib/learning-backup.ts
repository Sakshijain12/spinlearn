import { z } from "zod";
import { learningStateSchema, type LearningState } from "./learning";

export const learningBackupSchema = z.object({
  format: z.literal("spinlearn.learning-backup.v1"),
  accountId: z.string().uuid(),
  exportedAt: z.string().datetime(),
  state: learningStateSchema,
});

export type LearningBackup = z.infer<typeof learningBackupSchema>;

export function createLearningBackup(accountId: string, state: LearningState): LearningBackup {
  return learningBackupSchema.parse({
    format: "spinlearn.learning-backup.v1", accountId, exportedAt: new Date().toISOString(), state,
  });
}

export function validateLearningBackup(value: unknown, accountId: string): LearningBackup {
  const parsed = learningBackupSchema.safeParse(value);
  if (!parsed.success) throw new Error("This file is not a valid Spinlearn learning backup.");
  if (parsed.data.accountId !== accountId) {
    throw new Error("This backup belongs to a different account. Sign in to the original migrated account before importing.");
  }
  return parsed.data;
}
