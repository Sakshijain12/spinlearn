import { notFound } from "next/navigation";
import { LessonView } from "@/components/LessonView";
import { SAMPLE_TOPICS } from "@/lib/data";
import { getGlossary, getLesson } from "@/lib/lessons";
import { requireAccount } from "@/lib/auth/session";

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAccount();
  const { slug } = await params;
  const topic = SAMPLE_TOPICS.find((item) => item.slug === slug);
  const lesson = getLesson(slug);
  if (!topic || !lesson) notFound();

  return <LessonView key={slug} topic={topic} lesson={lesson} glossary={getGlossary(slug)} />;
}
