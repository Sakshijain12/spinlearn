"use client";

import Link from "next/link";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { useLearning } from "./LearningProvider";
import { completedStepCount, topicStatus } from "@/lib/learning";
import type { SAMPLE_TOPICS } from "@/lib/data";

export function TopicCard({ topic }: { topic: (typeof SAMPLE_TOPICS)[number] }) {
  const { state, ready, today, toggleBookmark } = useLearning();
  const progress = state.progress[topic.slug];
  const status = topicStatus(progress, today);
  const saved = state.bookmarks.includes(topic.slug);
  return (
    <article className="card relative flex h-full flex-col transition-colors hover:border-border-strong focus-within:border-accent-fill">
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="category" value={topic.category} />
        <Badge variant="level" value={topic.level} />
      </div>
      <h2 className="mb-2 text-heading font-medium tracking-tight">
        <Link href={`/lesson/${topic.slug}`} className="after:absolute after:inset-0 after:rounded-card">{topic.name}</Link>
      </h2>
      <p className="mb-5 line-clamp-2 text-body text-text-secondary">{topic.definition}</p>
      <div className="mt-auto flex items-center gap-2">
        <span className="mr-auto inline-flex items-center gap-1.5 whitespace-nowrap text-caption text-text-secondary">
          <Icon name="clock" size={14} />{topic.minutes} min
        </span>
        <Badge variant="status" value={status} label={status === "in_progress" ? `In progress \u00b7 ${completedStepCount(progress)}/5` : undefined} />
        <button type="button" className={`icon-button relative z-10 -mr-2 ${saved ? "text-accent-text [&_svg]:fill-accent-bg" : ""}`} disabled={!ready} aria-label={`${saved ? "Unsave" : "Save"} ${topic.name}`} aria-pressed={saved} onClick={() => toggleBookmark(topic.slug)}>
          <Icon name="bookmark" size={18} />
        </button>
      </div>
    </article>
  );
}
