import { z } from "zod";
import type { LessonContent } from "./schemas/validation";

export const STORAGE_KEY = "spinlearn.learning.v1";
export const CATEGORIES = ["All", "Foundations", "Deep learning", "LLMs", "Generative AI", "Training", "Deployment", "Alignment"] as const;
export const LEVELS = ["All", "Beginner", "Intermediate", "Advanced"] as const;
export const STEP_NAMES = ["Concept", "Intuition", "Math", "Code", "Quiz"] as const;
export type TopicStatus = "new" | "in_progress" | "learned" | "review_due";

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter a display name.").max(40),
  timezone: z.string().refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch (error) {
      if (error instanceof RangeError) return false;
      throw error;
    }
  }, "Select a valid timezone."),
});

const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const quickCheckSchema = z.object({
  answers: z.array(z.number().int().min(0).max(3)).max(1),
  score: z.union([z.literal(0), z.literal(1)]).nullable(),
}).refine((result) => result.score === null || result.answers.length === 1, {
  message: "A checked practice question must have an answer.",
  path: ["answers"],
});

const progressSchema = z.object({
  step: z.number().int().min(0).max(4),
  visited: z.array(z.number().int().min(0).max(4)),
  completedSteps: z.array(z.number().int().min(0).max(4)).default([]),
  answers: z.array(z.number().int().min(0).max(3)),
  quizQuestionIds: z.array(z.string()).default([]),
  score: z.number().min(0).max(1).nullable(),
  quizAttemptId: z.string().uuid().nullable().default(null),
  completedAttemptId: z.string().uuid().nullable().default(null),
  quickCheck: quickCheckSchema.default({ answers: [], score: null }),
  completedAt: z.string().datetime().nullable(),
  dueDate: daySchema.nullable(),
});

export const learningStateSchema = z.object({
  version: z.literal(1),
  previewEnded: z.boolean().default(false),
  profile: profileSchema,
  bookmarks: z.array(z.string()),
  progress: z.record(progressSchema),
  spin: z.object({
    id: z.string(),
    date: daySchema,
    slug: z.string(),
    respinsUsed: z.number().int().min(0).max(1),
  }).nullable(),
  activity: z.array(z.object({
    slug: z.string(),
    date: daySchema,
    correct: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    seconds: z.number().min(0).max(1800),
  })),
});

export type LearningState = z.infer<typeof learningStateSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type LessonProgress = z.infer<typeof progressSchema>;
export type DailySpin = NonNullable<LearningState["spin"]>;

export function initialLearningState(): LearningState {
  return {
    version: 1,
    previewEnded: false,
    profile: { displayName: "Alex Kim", timezone: "UTC" },
    bookmarks: [],
    progress: {},
    spin: null,
    activity: [],
  };
}

export function initialLessonProgress(): LessonProgress {
  return {
    step: 0, visited: [], completedSteps: [], answers: [], quizQuestionIds: [], score: null,
    quizAttemptId: null, completedAttemptId: null,
    quickCheck: { answers: [], score: null }, completedAt: null, dueDate: null,
  };
}

export function completedStepCount(progress: LessonProgress | undefined): number {
  return STEP_NAMES.filter((_, index) => progress?.completedSteps.includes(index)).length;
}

export function canCompleteLesson(progress: LessonProgress | undefined, questionCount: number): boolean {
  return Boolean(
    progress
    && Number.isInteger(questionCount)
    && questionCount > 0
    && completedStepCount(progress) === STEP_NAMES.length
    && progress.score === 1
    && progress.answers.length === questionCount
  );
}

export function quizMatches(progress: LessonProgress | undefined, questions: LessonContent["quiz"]): boolean {
  return progress?.quizQuestionIds?.length === questions.length
    && questions.every((question, index) => progress.quizQuestionIds[index] === question.id);
}

export function alignQuizProgress(
  progress: LessonProgress,
  questions: LessonContent["quiz"],
  legacyQuestionIds: string[]
): LessonProgress {
  if (!questions.length || new Set(questions.map((question) => question.id)).size !== questions.length) {
    throw new Error("A Quiz must contain uniquely identified questions.");
  }
  if (quizMatches(progress, questions)) return progress;

  const savedIds = progress.quizQuestionIds?.length ? progress.quizQuestionIds : legacyQuestionIds;
  const exactSavedLength = progress.answers.length === savedIds.length && new Set(savedIds).size === savedIds.length;
  const matched = questions.map((question) => {
    const index = savedIds.indexOf(question.id);
    const answer = progress.answers[index];
    return exactSavedLength && Number.isInteger(answer)
      && answer >= 0 && answer < question.options.length ? answer : undefined;
  });
  const allMatched = matched.every((answer) => answer !== undefined);
  const answers = allMatched ? matched.filter((answer): answer is number => answer !== undefined) : [];
  const score = allMatched && progress.score !== null
    ? questions.filter((question, index) => answers[index] === question.correct_index).length / questions.length
    : null;
  const readingSteps = progress.completedSteps.filter((step) => step !== 4);

  return {
    ...progress,
    quizQuestionIds: questions.map((question) => question.id),
    answers,
    score,
    completedSteps: score === 1 ? [...readingSteps, 4] : readingSteps,
  };
}

export function offsetDay(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function topicStatus(progress: LessonProgress | undefined, today: string): TopicStatus {
  if (progress?.completedAt) {
    return progress.dueDate && progress.dueDate <= today ? "review_due" : "learned";
  }
  return progress?.visited.length ? "in_progress" : "new";
}

export function latestQuizScore(state: LearningState, slug: string): number | null {
  const checkedScore = state.progress[slug]?.score;
  if (checkedScore !== null && checkedScore !== undefined) return checkedScore;
  const previous = [...state.activity].reverse().find((item) => item.slug === slug);
  return previous ? previous.correct / previous.total : null;
}

export function learningStats(state: LearningState, today: string) {
  const learned = Object.values(state.progress).filter((item) => item.completedAt).length;
  const dates = new Set(state.activity.map((item) => item.date));
  let streak = 0;
  if (today) {
    let cursor = dates.has(today) ? today : offsetDay(today, -1);
    while (dates.has(cursor)) {
      streak += 1;
      cursor = offsetDay(cursor, -1);
    }
  }
  const recent = today ? state.activity.filter((item) => item.date >= offsetDay(today, -29) && item.date <= today) : [];
  const answered = recent.reduce((sum, item) => sum + item.total, 0);
  const correct = recent.reduce((sum, item) => sum + item.correct, 0);
  const weekDay = today ? new Date(`${today}T12:00:00Z`).getUTCDay() : 1;
  const monday = today ? offsetDay(today, -((weekDay + 6) % 7)) : "";
  const timeByLesson = new Map<string, number>();
  for (const item of state.activity.filter((entry) => entry.date >= monday && entry.date <= today)) {
    const key = `${item.date}:${item.slug}`;
    timeByLesson.set(key, Math.min(1800, (timeByLesson.get(key) ?? 0) + item.seconds));
  }
  const weeklyMinutes = Math.floor([...timeByLesson.values()].reduce((sum, value) => sum + value, 0) / 60);
  return { learned, streak, accuracy: answered ? Math.round(correct / answered * 100) : null, weeklyMinutes };
}

export function activityDays(state: LearningState, today: string) {
  if (!today) return [];
  return Array.from({ length: 84 }, (_, index) => {
    const date = offsetDay(today, index - 83);
    const count = new Set(state.activity.filter((item) => item.date === date).map((item) => item.slug)).size;
    return { date, count };
  });
}
