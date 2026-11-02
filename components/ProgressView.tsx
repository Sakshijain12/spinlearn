"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import { MetricCards } from "@/components/MetricCards";
import { useLearning } from "@/components/LearningProvider";
import { SAMPLE_TOPICS } from "@/lib/data";
import { activityDays, CATEGORIES, latestQuizScore, topicStatus } from "@/lib/learning";
import { calculateMastery } from "@/lib/utils";

const heatColors = ["bg-surface-1", "bg-[#c0d6f5]", "bg-[#7ea9e6]", "bg-accent-fill"];

export default function ProgressPage() {
  const { state, today, ready, visitStep } = useLearning();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const days = activityDays(state, today);
  const selected = days.find((day) => day.date === selectedDay);
  const recent = SAMPLE_TOPICS.filter((topic) => state.progress[topic.slug]?.completedAt).sort((a, b) => (state.progress[b.slug].completedAt ?? "").localeCompare(state.progress[a.slug].completedAt ?? ""));
  const mastered = (slug: string) => Boolean(state.progress[slug]?.completedAt) && (latestQuizScore(state, slug) ?? 0) >= 0.8;

  return (
    <main id="main-content" className="page-container">
      <header className="mb-6">
        <h1 className="text-title font-medium tracking-tight">Your progress</h1>
        <p className="mt-2 text-small text-text-secondary">Small steps add up. Here&apos;s what you&apos;re learning along the way.</p>
      </header>
      <MetricCards showTime />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card min-w-0" aria-labelledby="activity-title">
          <h2 id="activity-title" className="section-label">Last 12 weeks</h2>
          <div className="overflow-x-auto pb-3">
            <div className="grid min-w-[300px] max-w-[360px] grid-flow-col grid-cols-12 grid-rows-7 gap-1.5" role="group" aria-label="Daily lesson activity">
              {days.map((day) => (
                <button key={day.date} type="button" onClick={() => setSelectedDay(day.date)} aria-label={`${day.date}: ${day.count} completed ${day.count === 1 ? "topic" : "topics"}`} aria-pressed={selectedDay === day.date} title={`${day.date}: ${day.count} completed`} className={`aspect-square rounded-[4px] border border-border/30 ${heatColors[Math.min(day.count, 3)]} ${selectedDay === day.date ? "outline outline-2 outline-offset-2 outline-accent-text" : ""}`} />
              ))}
              {!ready && Array.from({ length: 84 }, (_, index) => <span key={index} className="aspect-square rounded-[4px] bg-surface-1" />)}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-caption text-text-secondary"><span className="mr-1">Less</span>{heatColors.map((color) => <span key={color} className={`h-3.5 w-3.5 rounded-[3px] ${color}`} />)}<span className="ml-1">More</span></div>
          <p aria-live="polite" className="mt-6 min-h-12 text-small text-text-secondary">
            {selected ? `${new Date(`${selected.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}: ${selected.count} completed ${selected.count === 1 ? "topic" : "topics"}.` : state.activity.length ? "Select a day to explore your activity. A darker square means more completed topics." : "Your first completed lesson will light up a square. One concept is a great place to start."}
          </p>
          <p className="mt-5 border-t border-border pt-4 text-caption text-text-secondary">Quiz accuracy reflects completed lessons from the last 30 days. Time is recorded when you finish a lesson.</p>
        </section>
        <section className="card" aria-labelledby="mastery-title">
          <h2 id="mastery-title" className="section-label">Mastery by area</h2>
          <div className="space-y-4">
            {CATEGORIES.filter((category) => category !== "All").map((category) => {
              const topics = SAMPLE_TOPICS.filter((topic) => topic.category === category);
              const count = topics.filter((topic) => mastered(topic.slug)).length;
              const percent = calculateMastery(count, topics.length);
              return (
                <div key={category}>
                  <div className="mb-1.5 flex justify-between gap-3 text-small"><span>{category}</span><span className="text-text-secondary">{percent}%</span></div>
                  <div role="progressbar" aria-label={`${category} mastery`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-surface-1"><div className="h-full rounded-full bg-accent-fill" style={{ width: `${percent}%` }} /></div>
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-caption text-text-secondary">Mastered means completing a lesson with at least 80% on its latest quiz.</p>
        </section>
      </div>

      <section className="card mt-4" aria-labelledby="recent-title">
        <div className="mb-2 flex items-center justify-between gap-3"><h2 id="recent-title" className="section-label mb-0">Recently learned</h2><Link href="/library" className="text-link">Browse topics<Icon name="right" size={14} /></Link></div>
        {recent.length ? (
          <ul className="divide-y divide-border">
            {recent.map((topic) => {
              const progress = state.progress[topic.slug];
              const status = topicStatus(progress, today);
              return (
                <li key={topic.slug} className="flex flex-wrap items-center gap-3 py-4">
                  <Icon name={status === "review_due" ? "rotate" : "check"} className={status === "review_due" ? "text-warning-text" : "text-success-text"} />
                  <Link href={`/lesson/${topic.slug}`} className="mr-auto font-medium hover:text-accent-text">{topic.name}</Link>
                  <span className="text-caption text-text-secondary">{progress.completedAt ? new Date(progress.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: state.profile.timezone }) : ""}</span>
                  {status === "review_due" ? <Link href={`/lesson/${topic.slug}`} onClick={() => visitStep(topic.slug, 4)} className="btn-secondary">Review now</Link> : <Badge variant="status" value="learned" label={mastered(topic.slug) ? "Mastered" : "Learned"} />}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="py-9 text-center">
            <Icon name="library" size={30} className="mx-auto mb-3 text-text-secondary" />
            <h3 className="text-lg font-medium">Your next small win starts here</h3>
            <p className="mx-auto mt-2 max-w-md text-small text-text-secondary">Finish a lesson and check its quiz to start your streak. Your learning history will appear here.</p>
            <Link href="/lesson/kv-cache" className="btn-primary mt-5">Explore KV cache<Icon name="right" size={16} /></Link>
          </div>
        )}
      </section>
    </main>
  );
}
