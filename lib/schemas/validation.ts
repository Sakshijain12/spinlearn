import { z } from "zod";

// Concept practice is separate from the final assessment.
const textStepSchema = z.object({
  body: z.string().min(1).max(900),
  embed: z.enum(["none", "kv_cache_stepper", "attention_fan"]).optional(),
});

const mathStepSchema = z.object({
  body: z.string().min(1).max(900),
  formulas: z.array(z.string().min(1)).min(1).max(4),
  worked_example: z.string().max(400).optional(),
});

const codeStepSchema = z.object({
  language: z.enum(["python", "typescript", "bash"]),
  snippet: z.string().min(1).max(1200),
  explanation: z.string().min(1).max(500),
  full_example_url: z.string().url().optional(),
});

const quizQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(1).max(200),
  options: z.array(z.string().min(1)).min(3).max(4),
  correct_index: z.number().int().min(0).max(3),
  explanation: z.string().min(1).max(300),
}).refine((question) => question.correct_index < question.options.length, {
  message: "The correct answer must refer to an existing option.",
  path: ["correct_index"],
});

export const lessonContentSchema = z.object({
  schema_version: z.literal("lesson.v1"),
  title: z.string().max(60),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  category: z.enum([
    "Foundations",
    "Deep learning",
    "LLMs",
    "Generative AI",
    "Training",
    "Deployment",
    "Alignment",
  ]),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  minutes: z.number().int().min(5).max(25),
  one_line: z.string().max(160),
  steps: z.object({
    concept: textStepSchema.extend({ quick_check: quizQuestionSchema }),
    intuition: textStepSchema,
    math: mathStepSchema,
    code: codeStepSchema,
  }),
  quiz: z.array(quizQuestionSchema).min(2).max(6),
  key_terms: z.array(z.string()).min(3).max(6),
  used_in: z.array(z.string()).min(2).max(4),
  go_deeper: z.object({
    title: z.string(),
    url: z.string().url(),
  }),
}).refine((lesson) => lesson.quiz.every((question) =>
  question.id !== lesson.steps.concept.quick_check.id
  && question.question !== lesson.steps.concept.quick_check.question
), {
  message: "The Concept quick check must not be repeated in the final Quiz.",
  path: ["quiz"],
});

export type LessonContent = z.infer<typeof lessonContentSchema>;

// API Request/Response schemas
export const spinRequestSchema = z.object({
  category: z.enum([
    "Foundations",
    "Deep learning",
    "LLMs",
    "Generative AI",
    "Training",
    "Deployment",
    "Alignment",
    "All",
  ]).default("All"),
  level: z
    .enum(["Beginner", "Intermediate", "Advanced", "All"])
    .default("All"),
  respin: z.boolean().default(false),
  exclude_slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
});

export const quizAttemptRequestSchema = z.object({
  lesson_id: z.string(),
  mode: z.enum(["quick_check", "full"]),
  answers: z.array(
    z.object({
      question_id: z.string(),
      choice_index: z.number().int(),
    })
  ),
});

export const progressUpdateSchema = z.object({
  current_step: z.number().int().min(0).max(4),
  completed: z.boolean().optional(),
  active_seconds: z.number().int().min(0).max(1800).optional(),
});

export const updateProfileSchema = z.object({
  display_name: z.string().max(40).optional(),
  timezone: z.string().optional(),
  email_reminders: z.boolean().optional(),
});

export const askRequestSchema = z.object({
  topic_slug: z.string(),
  question: z.string().min(1).max(1000),
  step: z
    .enum(["concept", "intuition", "math", "code", "quiz"])
    .optional(),
  term: z.string().max(60).optional(),
});

export const topicsListRequestSchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().optional(),
  level: z.string().optional(),
  status: z
    .enum(["new", "in_progress", "learned", "review_due"])
    .optional(),
  sort: z
    .enum(["recommended", "name", "level", "recent"])
    .default("recommended"),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const topicDetailSchema = z.object({
  slug: z.string(),
  name: z.string(),
  category: z.string(),
  level: z.string(),
  minutes: z.number(),
  definition: z.string(),
  status: z
    .enum(["new", "in_progress", "learned", "review_due"])
    .optional(),
});

export const spinResponseSchema = z.object({
  spin: z.object({
    id: z.string().uuid(),
    topic: topicDetailSchema,
    respins_used: z.number().int().min(0).max(1),
    respins_left: z.number().int().min(0).max(1),
    pool_size: z.number().int().positive(),
  }),
  reel: z.object({
    options: z.array(z.string()).length(42),
    chosen_index: z.literal(40),
  }),
}).refine((result) => result.reel.options[result.reel.chosen_index] === result.spin.topic.name, {
  message: "The reel result does not match the selected topic.",
});
