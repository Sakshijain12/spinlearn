import type { LessonContent } from "../schemas/validation";

export type LessonDraft = Omit<
  LessonContent,
  "schema_version" | "title" | "slug" | "category" | "level" | "minutes" | "key_terms" | "steps"
> & {
  steps: Omit<LessonContent["steps"], "concept"> & {
    concept: Omit<LessonContent["steps"]["concept"], "quick_check">;
  };
  terms: Record<string, string>;
};
