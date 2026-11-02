import { notFound } from "next/navigation";
import { LessonView } from "@/components/LessonView";
import { SAMPLE_TOPICS } from "@/lib/data";
import { getGlossary, getLesson } from "@/lib/lessons";
import { jsonLd, publicMetadata, SITE_URL } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = SAMPLE_TOPICS.find((item) => item.slug === slug);
  if (!topic) return { title: "Topic not found", robots: { index: false } };
  return publicMetadata(`${topic.name}: explanation, examples and quiz`, topic.definition, `/lesson/${topic.slug}`);
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = SAMPLE_TOPICS.find((item) => item.slug === slug);
  const lesson = getLesson(slug);
  if (!topic || !lesson) notFound();

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({
      "@context": "https://schema.org", "@type": "LearningResource",
      name: topic.name, description: topic.definition, url: `${SITE_URL}/lesson/${topic.slug}`,
      learningResourceType: "Lesson", educationalUse: "Self study", inLanguage: "en",
      isAccessibleForFree: true, timeRequired: `PT${topic.minutes}M`,
      about: { "@type": "Thing", name: topic.category },
    }) }} />
    <LessonView key={slug} topic={topic} lesson={lesson} glossary={getGlossary(slug)} />
  </>;
}
