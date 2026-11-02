import { z } from "zod";
import {
  alignQuizProgress, canCompleteLesson, initialLearningState, initialLessonProgress,
  learningStateSchema, offsetDay, profileSchema, quizMatches, type LearningState,
} from "./learning";
import type { LessonContent } from "./schemas/validation";
import { getTodayDate } from "./utils";

const slug = z.string().regex(/^[a-z0-9-]+$/).max(100);
const answer = z.number().int().min(0).max(3);

export const learningActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("visit"), slug, step: z.number().int().min(0).max(4) }),
  z.object({ type: z.literal("complete-step"), slug, step: z.number().int().min(0).max(3) }),
  z.object({ type: z.literal("prepare-quiz"), slug }),
  z.object({ type: z.literal("quiz"), slug, answers: z.array(answer).min(2).max(6).nullable() }),
  z.object({ type: z.literal("quick-check"), slug, answers: z.array(answer).max(1), checked: z.boolean() }),
  z.object({ type: z.literal("complete-lesson"), slug, seconds: z.number().min(0).max(1800) }),
  z.object({ type: z.literal("bookmark"), slug, saved: z.boolean() }),
  z.object({ type: z.literal("profile"), profile: profileSchema }),
  z.object({ type: z.literal("spin"), spin: learningStateSchema.shape.spin.unwrap() }),
  z.object({ type: z.literal("reset") }),
  z.object({ type: z.literal("restore"), state: learningStateSchema }),
  z.object({ type: z.literal("import-browser"), state: learningStateSchema }),
  z.object({ type: z.literal("skip-browser-import") }),
]);

export const learningMutationSchema = z.object({
  accountId: z.string().uuid(),
  requestId: z.string().uuid(),
  action: learningActionSchema,
  expectedRevision: z.number().int().nonnegative().optional(),
});

export const learningSnapshotSchema = z.object({
  accountId: z.string().uuid(),
  state: learningStateSchema,
  revision: z.number().int().nonnegative(),
});

export type LearningAction = z.infer<typeof learningActionSchema>;
export type LearningMutation = z.infer<typeof learningMutationSchema>;
export type LearningSnapshot = z.infer<typeof learningSnapshotSchema>;

export class LearningActionError extends Error {
  readonly status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.status = status;
  }
}

export function applyLearningAction(
  state: LearningState,
  action: LearningAction,
  context: { requestId: string; now: Date; lesson?: LessonContent }
): LearningState {
  if (action.type === "profile") return { ...state, profile: action.profile };
  if (action.type === "bookmark") {
    return {
      ...state,
      bookmarks: action.saved ? [...new Set([...state.bookmarks, action.slug])] : state.bookmarks.filter((item) => item !== action.slug),
    };
  }
  if (action.type === "reset") return { ...initialLearningState(), profile: state.profile };
  if (action.type === "restore" || action.type === "import-browser") return { ...action.state, previewEnded: false };
  if (action.type === "skip-browser-import") return state;
  if (action.type === "spin") {
    const today = getTodayDate(state.profile.timezone, context.now);
    const previous = state.spin?.date === today ? state.spin : null;
    if (previous?.respinsUsed === 1) throw new LearningActionError("You've used today's re-spin. Browse the Library or come back tomorrow.");
    return { ...state, spin: { ...action.spin, date: today, respinsUsed: previous ? 1 : 0 } };
  }

  const progress = state.progress[action.slug] ?? initialLessonProgress();
  const update = (next: typeof progress) => ({ ...state, progress: { ...state.progress, [action.slug]: next } });
  if (action.type === "visit") {
    if (progress.step === action.step && progress.visited.includes(action.step)) return state;
    return update({ ...progress, step: action.step, visited: [...new Set([...progress.visited, action.step])] });
  }
  if (action.type === "complete-step") {
    return update({
      ...progress, step: action.step + 1,
      visited: [...new Set([...progress.visited, action.step, action.step + 1])],
      completedSteps: [...new Set([...progress.completedSteps, action.step])],
    });
  }

  const lesson = context.lesson;
  if (!lesson || lesson.slug !== action.slug) throw new LearningActionError("This lesson could not be found.", 404);
  if (action.type === "prepare-quiz") {
    const aligned = alignQuizProgress(progress, lesson.quiz, [lesson.steps.concept.quick_check.id, ...lesson.quiz.map((question) => question.id)]);
    if (aligned.score !== null && !aligned.quizAttemptId) {
      return update({
        ...aligned, quizAttemptId: context.requestId,
        completedAttemptId: aligned.completedAt ? context.requestId : null,
      });
    }
    return aligned === progress ? state : update(aligned);
  }
  if (action.type === "quiz") {
    const readingSteps = progress.completedSteps.filter((step) => step !== 4);
    if (action.answers === null) return update({ ...progress, answers: [], score: null, quizAttemptId: null, completedSteps: readingSteps });
    if (action.answers.length !== lesson.quiz.length || action.answers.some((value, index) => value >= lesson.quiz[index].options.length)) {
      throw new LearningActionError("Answer every quiz question with one of its listed choices.");
    }
    const score = lesson.quiz.filter((question, index) => action.answers?.[index] === question.correct_index).length / lesson.quiz.length;
    return update({
      ...progress, answers: action.answers, score, quizQuestionIds: lesson.quiz.map((question) => question.id),
      quizAttemptId: context.requestId, completedSteps: score === 1 ? [...readingSteps, 4] : readingSteps,
    });
  }
  if (action.type === "quick-check") {
    const question = lesson.steps.concept.quick_check;
    if ((action.checked && action.answers.length !== 1) || action.answers.some((value) => value >= question.options.length)) {
      throw new LearningActionError("Select one of the listed Quick check answers.");
    }
    return update({
      ...progress,
      quickCheck: { answers: action.answers, score: action.checked ? action.answers[0] === question.correct_index ? 1 : 0 : null },
    });
  }
  if (!canCompleteLesson(progress, lesson.quiz.length) || !quizMatches(progress, lesson.quiz) || !progress.quizAttemptId) {
    throw new LearningActionError("Complete each reading section and correctly answer every quiz question before finishing.");
  }
  if (progress.completedAttemptId === progress.quizAttemptId) return state;
  const today = getTodayDate(state.profile.timezone, context.now);
  return {
    ...update({ ...progress, completedAt: context.now.toISOString(), dueDate: offsetDay(today, 7), completedAttemptId: progress.quizAttemptId }),
    activity: [...state.activity, { slug: action.slug, date: today, correct: lesson.quiz.length, total: lesson.quiz.length, seconds: action.seconds }],
  };
}
