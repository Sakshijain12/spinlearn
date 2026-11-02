"use client";

import { useLearning } from "./LearningProvider";
import Link from "next/link";

export function MetricCards({ showTime = false }: { showTime?: boolean }) {
  const { stats, ready, account } = useLearning();
  if (!account) return (
    <section className="rounded-card bg-surface-1 p-5 text-center">
      <h2 className="text-body font-medium">Learn freely. Keep your progress when you log in.</h2>
      <p className="mt-2 text-small text-text-secondary">No account is needed to explore lessons. Log in to save your streak, quiz results, and bookmarks across devices.</p>
      <Link href="/login?next=%2Fprogress" className="text-link mt-3">Log in to view progress</Link>
    </section>
  );
  const values = [
    { label: "Topics learned", value: String(stats.learned) },
    { label: "Current streak", value: `${stats.streak} ${stats.streak === 1 ? "day" : "days"}` },
    { label: "Quiz accuracy", value: stats.accuracy === null ? "\u2014" : `${stats.accuracy}%` },
    ...(showTime ? [{ label: "This week", value: stats.weeklyMinutes >= 60 ? `${Math.floor(stats.weeklyMinutes / 60)}h ${stats.weeklyMinutes % 60}m` : `${stats.weeklyMinutes} min` }] : []),
  ];
  return (
    <dl className={`grid gap-3 ${showTime ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3"}`}>
      {values.map((item) => (
        <div key={item.label} className="metric-card">
          <dt className="text-[11px] text-text-secondary sm:text-caption">{item.label}</dt>
          <dd className="mt-1.5 text-xl font-medium tracking-tight md:text-heading">{ready ? item.value : "\u2014"}</dd>
        </div>
      ))}
    </dl>
  );
}
