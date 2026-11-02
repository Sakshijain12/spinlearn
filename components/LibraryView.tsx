"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { TopicCard } from "@/components/TopicCard";
import { TopicFilters } from "@/components/TopicFilters";
import { useLearning } from "@/components/LearningProvider";
import { SAMPLE_TOPICS } from "@/lib/data";
import { CATEGORIES, LEVELS, topicStatus } from "@/lib/learning";

function LibraryContent() {
  const params = useSearchParams();
  const { state, today, stats } = useLearning();
  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [visibleCount, setVisibleCount] = useState(20);
  const rawCategory = params.get("category") ?? "All";
  const rawLevel = params.get("level") ?? "All";
  const rawStatus = params.get("status") ?? "all";
  const rawSort = params.get("sort") ?? "recommended";
  const validCategory = CATEGORIES.some((item) => item === rawCategory);
  const validLevel = LEVELS.some((item) => item === rawLevel);
  const validStatus = ["all", "new", "in_progress", "learned", "review_due"].includes(rawStatus);
  const validSort = ["recommended", "name", "level", "recent"].includes(rawSort);
  const category = validCategory ? rawCategory : "All";
  const level = validLevel ? rawLevel : "All";
  const status = validStatus ? rawStatus : "all";
  const sort = validSort ? rawSort : "recommended";
  const savedOnly = params.get("saved") === "1";
  const invalidFilters = !validCategory || !validLevel || !validStatus || !validSort;

  useEffect(() => setQuery(urlQuery), [urlQuery]);
  useEffect(() => setVisibleCount(20), [query, category, level, status, savedOnly, sort]);

  const updateFilter = (key: string, value: string, defaultValue: string) => {
    const next = new URLSearchParams(window.location.search);
    if (value === defaultValue) next.delete(key); else next.set(key, value);
    window.history.replaceState(null, "", next.size ? `/library?${next}` : "/library");
  };
  const resetFilters = () => {
    setQuery("");
    window.history.replaceState(null, "", "/library");
  };

  const filtered = SAMPLE_TOPICS.filter((topic) => {
    const matchesQuery = `${topic.name} ${topic.definition}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (category === "All" || topic.category === category)
      && (level === "All" || topic.level === level)
      && (status === "all" || topicStatus(state.progress[topic.slug], today) === status)
      && (!savedOnly || state.bookmarks.includes(topic.slug));
  });
  const levelOrder: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  const statusOrder = { review_due: 0, in_progress: 1, new: 2, learned: 3 };
  if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "level") filtered.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
  if (sort === "recent") filtered.reverse();
  if (sort === "recommended") filtered.sort((a, b) => statusOrder[topicStatus(state.progress[a.slug], today)] - statusOrder[topicStatus(state.progress[b.slug], today)]);

  return (
    <main id="main-content" className="page-container">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title font-medium tracking-tight">Library</h1>
          <p className="mt-2 text-small text-text-secondary">{SAMPLE_TOPICS.length} topics across {new Set(SAMPLE_TOPICS.map((item) => item.category)).size} areas. {stats.learned} learned, a little more to discover.</p>
        </div>
        <div>
          <label htmlFor="library-sort" className="sr-only">Sort topics</label>
          <select id="library-sort" className="field" value={sort} onChange={(event) => updateFilter("sort", event.target.value, "recommended")}>
            <option value="recommended">Sort: recommended</option><option value="name">Sort: A to Z</option><option value="level">Sort: level</option><option value="recent">Sort: recently added</option>
          </select>
        </div>
      </header>

      <label className="relative mb-4 block">
        <span className="sr-only">Search topics</span>
        <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input type="search" className="field h-12 w-full pl-11 text-body" placeholder="Search topics, like attention or LoRA" value={query} maxLength={100} onChange={(event) => { setQuery(event.target.value); updateFilter("q", event.target.value.trim() ? event.target.value : "", ""); }} />
      </label>

      <TopicFilters category={category} level={level} onCategoryChange={(value) => updateFilter("category", value, "All")} onLevelChange={(value) => updateFilter("level", value, "All")} />
      <div className="my-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2" role="group" aria-label="Saved topics filter">
          <button className="filter-chip" type="button" aria-pressed={!savedOnly} onClick={() => updateFilter("saved", "", "")}>All topics</button>
          <button className="filter-chip gap-1.5" type="button" aria-pressed={savedOnly} onClick={() => updateFilter("saved", "1", "")}><Icon name="bookmark" size={14} />Saved ({state.bookmarks.length})</button>
        </div>
        <div className="flex items-center gap-3">
          {(params.size > 0 || query) && <button type="button" className="text-link" onClick={resetFilters}>Reset filters</button>}
          <div>
            <label htmlFor="library-status" className="sr-only">Topic status</label>
            <select id="library-status" className="field" value={status} onChange={(event) => updateFilter("status", event.target.value, "all")}>
              <option value="all">Any status</option><option value="new">New</option><option value="in_progress">In progress</option><option value="learned">Learned</option><option value="review_due">Review due</option>
            </select>
          </div>
        </div>
      </div>
      {invalidFilters && <div role="alert" className="mb-4 rounded-default bg-warning-bg px-4 py-3 text-small text-warning-text">This link contains an unrecognized filter. <button className="underline" onClick={resetFilters}>Reset filters</button> to start again.</div>}

      <p role="status" className="mb-3 text-caption text-text-secondary">{filtered.length} {filtered.length === 1 ? "topic" : "topics"}{savedOnly ? " saved for later" : " to explore"}</p>
      {filtered.length ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.slice(0, visibleCount).map((topic) => <TopicCard key={topic.slug} topic={topic} />)}</div>
          <div className="mt-7 text-center">
            {visibleCount < filtered.length ? <button type="button" className="btn-secondary" onClick={() => setVisibleCount((count) => count + 20)}>Show more topics</button> : <p className="text-caption text-text-secondary">You&apos;re all caught up with this selection.</p>}
          </div>
        </>
      ) : (
        <div className="rounded-card border border-dashed border-border-strong px-6 py-14 text-center">
          <Icon name={savedOnly ? "bookmark" : "search"} size={28} className="mx-auto mb-4 text-text-secondary" />
          <h2 className="text-lg font-medium">{savedOnly ? "Make room for your next idea" : "Try a little broader curiosity"}</h2>
          <p className="mx-auto mt-2 max-w-md text-small text-text-secondary">{savedOnly ? "Save a topic using its bookmark, then find it here whenever you're ready." : "No topics match all these filters. Try another search or reset your selection."}</p>
          <button type="button" onClick={resetFilters} className="btn-secondary mt-5">Browse all topics<Icon name="right" size={16} /></button>
        </div>
      )}
    </main>
  );
}

export default function LibraryPage() {
  return <Suspense fallback={<main id="main-content" className="page-container"><h1 className="text-title font-medium">Library</h1><p className="mt-4 text-text-secondary">Loading your topic selection...</p></main>}><LibraryContent /></Suspense>;
}
