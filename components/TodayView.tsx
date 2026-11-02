"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import { Reel } from "@/components/Reel";
import { TopicFilters } from "@/components/TopicFilters";
import { MetricCards } from "@/components/MetricCards";
import { useLearning } from "@/components/LearningProvider";
import { SAMPLE_TOPICS } from "@/lib/data";
import { spinResponseSchema } from "@/lib/schemas/validation";

export default function TodayView() {
  const router = useRouter();
  const { state, account, ready, saving, today, saveSpin, toggleBookmark, notify } = useLearning();
  const [category, setCategory] = useState("All");
  const [level, setLevel] = useState("All");
  const [loading, setLoading] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState("");
  const [deck, setDeck] = useState<{ options: string[]; selectedIndex: number } | null>(null);
  const request = useRef<AbortController | null>(null);
  const resultCard = useRef<HTMLElement>(null);
  const revealResult = useRef(false);
  const spin = state.spin?.date === today ? state.spin : null;
  const topic = SAMPLE_TOPICS.find((item) => item.slug === spin?.slug);
  const idleOptions = useMemo(() => ["Embeddings", topic?.name ?? "?", "Fine-tuning"], [topic]);
  const poolSize = SAMPLE_TOPICS.filter((item) => (category === "All" || item.category === category) && (level === "All" || item.level === level)).length;
  const busy = loading || rolling || saving;
  const finishSpin = useCallback(() => {
    revealResult.current = true;
    setRolling(false);
  }, []);
  const saved = topic ? state.bookmarks.includes(topic.slug) : false;

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    setDeck(null);
    setRolling(false);
  }, [today]);
  useEffect(() => {
    if (rolling || !topic || !revealResult.current) return;
    revealResult.current = false;
    resultCard.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [rolling, topic]);

  const handleSpin = async () => {
    if (busy) return;
    if (spin?.respinsUsed === 1) {
      if (!account) { router.push("/library"); return; }
      notify("You've used today's re-spin. A new topic unlocks tomorrow.");
      return;
    }
    if (!poolSize) {
      setError("No complete lessons match these filters. Choose another area or level.");
      return;
    }
    setError("");
    setLoading(true);
    request.current = new AbortController();
    try {
      const response = await fetch("/api/v1/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, level, respin: Boolean(spin), exclude_slug: spin?.slug }),
        signal: request.current.signal,
      });
      if (!response.ok) throw new Error(`Spin request failed (${response.status}).`);
      const result = spinResponseSchema.parse(await response.json());
      if (!await saveSpin({ id: result.spin.id, date: today, slug: result.spin.topic.slug, respinsUsed: spin ? 1 : 0 })) {
        setError("The topic could not be saved. Check the notice above, then try again.");
        return;
      }
      setDeck({ options: result.reel.options, selectedIndex: result.reel.chosen_index });
      setRolling(true);
      router.prefetch(`/lesson/${result.spin.topic.slug}`);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      console.error("Spinlearn could not load the spin.", cause);
      setError("Your topic could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setCategory("All");
    setLevel("All");
    setError("");
  };

  return (
    <main id="main-content" className="page-container">
      <header className="mb-7 text-center md:mb-8">
        <p className="mb-3 min-h-6 text-small text-text-secondary">
          {today ? new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }) : "Your daily learning moment"}
        </p>
        <h1 className="text-title font-medium tracking-tight md:text-display">What will you learn today?</h1>
        <p className="mt-3 hidden text-body text-text-secondary sm:block">One AI concept a day, from the ideas engineers and researchers use most.</p>
      </header>

      <div className="mb-6 md:mb-7">
        <TopicFilters category={category} level={level} onCategoryChange={setCategory} onLevelChange={setLevel} disabled={busy} />
        <p className="mt-2 text-center text-caption text-text-secondary" aria-live="polite">
          {poolSize} complete {poolSize === 1 ? "lesson matches" : "lessons match"} your filters
          {poolSize === 1 ? ". Choose All for more variety." : "."}
        </p>
      </div>
      {error && <p role="alert" className="mx-auto mb-4 max-w-[780px] rounded-default bg-danger-bg px-4 py-3 text-small text-danger-text">{error}</p>}
      {!poolSize && !error && <p className="mb-4 text-center text-small text-text-secondary">No complete lessons in this selection. <button type="button" onClick={resetFilters} className="text-link">Reset filters</button></p>}

      <Reel options={deck?.options ?? idleOptions} selectedIndex={deck?.selectedIndex ?? 1} isSpinning={rolling} onSpinComplete={finishSpin} />
      <div className="mb-7 mt-6 text-center">
        <button type="button" onClick={handleSpin} disabled={!ready || !today || busy} className={`${topic && !rolling ? "btn-secondary" : "btn-primary"} min-h-[46px] min-w-[188px] px-6 text-body`}>
          <Icon name="rotate" size={18} />
          {loading ? "Choosing a topic..." : rolling ? "Spinning..." : spin?.respinsUsed === 1 ? account ? "Come back tomorrow" : "Browse the library" : spin ? "Spin again" : "Start spinning"}
        </button>
        <p className="mt-3 min-h-5 text-caption text-text-secondary">
          {busy ? "A little curiosity goes a long way" : spin ? spin.respinsUsed === 1 ? account ? "Your next topic unlocks at local midnight" : "Explore any lesson in the library without logging in" : account ? "1 re-spin left today" : "1 re-spin left for this visit" : `Rolling from ${poolSize} ${poolSize === 1 ? "topic" : "topics"}`}
        </p>
      </div>

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {rolling ? "The reel is spinning." : topic ? `Today's topic: ${topic.name}, ${topic.level}, ${topic.minutes} minutes.` : "Spin to find today's topic."}
      </p>

      <div className="mx-auto max-w-[780px]">
        {topic && !rolling ? (
          <section ref={resultCard} aria-label="Today's topic" className="card result-reveal scroll-mb-24 scroll-mt-24 p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="category" value={topic.category} />
              <Badge variant="level" value={topic.level} />
              <span className="ml-1 inline-flex items-center gap-1.5 text-caption text-text-secondary"><Icon name="clock" size={14} />{topic.minutes} min</span>
            </div>
            <h2 className="mb-2 text-heading font-medium tracking-tight">{topic.name}</h2>
            <p className="text-body text-text-secondary">{topic.definition}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href={`/lesson/${topic.slug}`} className="btn-primary">Start lesson<Icon name="right" size={17} /></Link>
              <button type="button" className="btn-secondary" disabled={saving} aria-pressed={saved} onClick={() => toggleBookmark(topic.slug)}><Icon name={saved ? "check" : "bookmark"} size={17} />{saved ? "Saved for later" : account ? "Save for later" : "Log in to save"}</button>
            </div>
          </section>
        ) : (
          <div className="flex min-h-[100px] items-center justify-center rounded-card border border-dashed border-border-strong px-6 py-7 text-center text-small text-text-secondary">
            {rolling ? "Your next idea is on its way" : "Your topic card appears here after the spin"}
          </div>
        )}
        <div className="mt-6"><MetricCards /></div>
        <p className="mt-5 text-center text-caption text-text-secondary">
          Prefer to choose? <Link href="/library" className="text-link">Explore the library<Icon name="right" size={14} /></Link>
        </p>
      </div>
    </main>
  );
}
