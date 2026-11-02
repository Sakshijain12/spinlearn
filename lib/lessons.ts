import { SAMPLE_TOPICS } from "./data";
import { foundations } from "./content/foundations";
import { deepLearning } from "./content/deep-learning";
import { llms } from "./content/llms";
import { generativeAI } from "./content/generative-ai";
import { training } from "./content/training";
import { deployment } from "./content/deployment";
import { alignment } from "./content/alignment";
import type { LessonDraft } from "./content/types";
import { lessonContentSchema, type LessonContent } from "./schemas/validation";

const definitions: Record<string, LessonDraft> = {
  ...foundations, ...deepLearning, ...llms, ...generativeAI, ...training, ...deployment, ...alignment,
};

export const AVAILABLE_LESSONS: LessonContent[] = SAMPLE_TOPICS.map((topic) => {
  const definition = definitions[topic.slug];
  if (!definition) throw new Error(`Missing lesson content for ${topic.slug}.`);
  const { terms, steps, quiz: questions, ...content } = definition;
  // The first authored question belongs to Concept, not the final assessment.
  const [quickCheck, ...quiz] = questions;
  return lessonContentSchema.parse({
    ...content,
    steps: { ...steps, concept: { ...steps.concept, quick_check: quickCheck } },
    quiz,
    schema_version: "lesson.v1",
    slug: topic.slug,
    title: topic.name,
    category: topic.category,
    level: topic.level,
    minutes: topic.minutes,
    key_terms: Object.keys(terms),
  });
});

export const PUBLISHED_TOPICS = SAMPLE_TOPICS;

export function getLesson(slug: string): LessonContent | undefined {
  return AVAILABLE_LESSONS.find((lesson) => lesson.slug === slug);
}

export function getGlossary(slug: string): Record<string, string> {
  const definition = definitions[slug];
  if (!definition) throw new Error(`Missing lesson glossary for ${slug}.`);
  return definition.terms;
}
