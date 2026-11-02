"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import { StepBar } from "@/components/StepBar";
import { Quiz } from "@/components/Quiz";
import { AttentionDemo, CodeBlock, Formula, KVCacheDemo } from "@/components/LessonWidgets";
import { useLearning } from "@/components/LearningProvider";
import type { Topic } from "@/lib/data";
import type { LessonContent } from "@/lib/schemas/validation";
import { STEP_NAMES, canCompleteLesson, completedStepCount, quizMatches } from "@/lib/learning";

export function LessonView({ topic, lesson, glossary }: {
  topic: Topic;
  lesson: LessonContent;
  glossary: Record<string, string>;
}) {
  const { slug } = lesson;
  const { state, ready, visitStep, completeStep, prepareQuiz, saveQuiz, saveQuickCheck, completeLesson, toggleBookmark } = useLearning();
  const progress = state.progress[slug];
  const currentStep = progress?.step ?? 0;
  const quizReady = ready && quizMatches(progress, lesson.quiz);
  const [completed, setCompleted] = useState(false);
  const [term, setTerm] = useState<string | null>(null);
  const elapsed = useRef(0);
  const activeSince = useRef<number | null>(null);

  useEffect(() => {
    setCompleted(false);
    setTerm(null);
  }, [slug]);
  useEffect(() => {
    if (ready && lesson) visitStep(slug, currentStep);
  }, [ready, lesson, slug, currentStep, visitStep]);
  useEffect(() => {
    if (ready) window.scrollTo({ top: 0, behavior: "instant" });
  }, [ready, currentStep]);
  useEffect(() => {
    if (ready && currentStep === 4) {
      prepareQuiz(slug, lesson.quiz, [lesson.steps.concept.quick_check.id, ...lesson.quiz.map((question) => question.id)]);
    }
  }, [ready, currentStep, slug, lesson, prepareQuiz]);
  useEffect(() => {
    if (!ready || !lesson) return;
    elapsed.current = 0;
    const updateVisibility = () => {
      if (activeSince.current !== null) elapsed.current += (performance.now() - activeSince.current) / 1000;
      activeSince.current = document.visibilityState === "visible" ? performance.now() : null;
    };
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      if (activeSince.current !== null) elapsed.current += (performance.now() - activeSince.current) / 1000;
      activeSince.current = null;
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [ready, lesson, slug]);

  const finish = () => {
    const seconds = elapsed.current + (activeSince.current !== null ? (performance.now() - activeSince.current) / 1000 : 0);
    if (completeLesson(slug, seconds, lesson.quiz.length)) {
      activeSince.current = null;
      setCompleted(true);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const saved = state.bookmarks.includes(slug);
  const title = (
    <header className="mb-6">
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-caption text-text-secondary">
        <Link href="/" className="hover:text-accent-text">Today</Link><Icon name="chevron" size={13} />
        <Link href={`/library?category=${encodeURIComponent(topic.category)}`} className="hover:text-accent-text">{topic.category}</Link><Icon name="chevron" size={13} /><span aria-current="page">{topic.name}</span>
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-1 text-title font-medium tracking-tight md:text-display">{topic.name}</h1>
        <Badge variant="category" value={topic.category} /><Badge variant="level" value={topic.level} />
        <span className="inline-flex items-center gap-1.5 text-caption text-text-secondary"><Icon name="clock" size={14} />{topic.minutes} min</span>
        <button type="button" className={`icon-button ml-auto ${saved ? "text-accent-text [&_svg]:fill-accent-bg" : ""}`} disabled={!ready} aria-label={`${saved ? "Unsave" : "Save"} ${topic.name}`} aria-pressed={saved} onClick={() => toggleBookmark(slug)}><Icon name="bookmark" size={20} /></button>
      </div>
    </header>
  );

  if (completed) {
    return (
      <main id="main-content" className="page-container">
        <section className="card mx-auto my-8 max-w-xl px-6 py-10 text-center md:my-14">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success-text"><Icon name="check" size={28} /></div>
          <p className="section-label">Lesson complete</p>
          <h1 className="text-title font-medium tracking-tight">One more idea, understood</h1>
          <p className="mt-3 text-body text-text-secondary">You&apos;ve completed {lesson.title}.</p>
          <div className="my-6 grid grid-cols-2 gap-3 text-left">
            <div className="metric-card"><p className="text-caption text-text-secondary">Quiz result</p><p className="mt-1 text-heading font-medium">{Math.round((progress?.score ?? 0) * 100)}%</p></div>
            <div className="metric-card"><p className="text-caption text-text-secondary">Review on</p><p className="mt-1 text-heading font-medium">{progress?.dueDate ? new Date(`${progress.dueDate}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "\u2014"}</p></div>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row"><Link href="/progress" className="btn-primary">View your progress<Icon name="right" size={16} /></Link><Link href="/" className="btn-secondary">Back to today</Link></div>
        </section>
      </main>
    );
  }

  const stepContent = () => {
    if (currentStep === 0) return <p className="text-body leading-7 text-text-secondary">{lesson.steps.concept.body}</p>;
    if (currentStep === 1) return <><p className="text-body leading-7 text-text-secondary">{lesson.steps.intuition.body}</p>{lesson.steps.intuition.embed === "kv_cache_stepper" && <KVCacheDemo />}{lesson.steps.intuition.embed === "attention_fan" && <AttentionDemo />}</>;
    if (currentStep === 2) return <div className="space-y-4"><p className="text-body leading-7 text-text-secondary">{lesson.steps.math.body}</p>{lesson.steps.math.formulas.map((formula) => <Formula key={formula} value={formula} />)}{slug === "kv-cache" && <p className="text-caption text-text-secondary">L: layers &middot; H: KV heads &middot; d: head size &middot; S: sequence length &middot; N: batch size &middot; b: bytes per value.</p>}<p className="text-small leading-6 text-text-secondary">{lesson.steps.math.worked_example}</p></div>;
    if (currentStep === 3) return <div className="space-y-4"><p className="text-body leading-7 text-text-secondary">{lesson.steps.code.explanation}</p><CodeBlock code={lesson.steps.code.snippet} language={lesson.steps.code.language} downloadable={slug === "kv-cache"} /></div>;
    return <div className="space-y-4"><p className="text-small text-text-secondary">Answer every question correctly to complete Quiz. The Concept quick check is not repeated here.</p>{quizReady ? <Quiz key={`${slug}-full-${progress?.quizQuestionIds.join(",")}`} questions={lesson.quiz} initialAnswers={progress?.answers} initialScore={progress?.score} onChecked={(answers, score) => saveQuiz(slug, answers, score, lesson.quiz.length)} onRetry={() => saveQuiz(slug, [], null, lesson.quiz.length)} /> : <p className="text-small text-text-secondary">Preparing your Quiz...</p>}</div>;
  };

  return (
    <main id="main-content" className="page-container">
      {title}
      <div className="mb-6">
        <StepBar currentStep={currentStep} completedSteps={progress?.completedSteps ?? []} disabled={!ready} onStepClick={(step) => visitStep(slug, step)} />
        <p aria-live="polite" className="mt-2 text-caption text-text-secondary">{completedStepCount(progress)} of 5 sections complete. The outline shows your current section; a filled bar and check mean completed.</p>
        {progress?.completedAt && completedStepCount(progress) < 5 && <p className="mt-1 text-caption text-text-secondary">Your earlier lesson result is saved in Progress. Section confirmations are tracked separately.</p>}
      </div>
      <div className="grid items-start gap-4 min-[900px]:grid-cols-[1.7fr_1fr]">
        <div className="min-w-0 space-y-4">
          <section className="card"><h2 className="section-label">In one line</h2><p className="text-body-lg leading-7">{lesson.one_line}</p></section>
          <section className="card min-w-0" aria-labelledby="step-title"><h2 id="step-title" className="section-label">{STEP_NAMES[currentStep]}</h2>{ready ? stepContent() : <p className="text-small text-text-secondary">Loading your lesson progress...</p>}</section>
          {currentStep === 0 && (
            <section className="card" aria-labelledby="quick-check-title">
              <h2 id="quick-check-title" className="section-label">Quick check</h2>
              {ready ? (
                <Quiz
                  key={`${slug}-quick`}
                  questions={[lesson.steps.concept.quick_check]}
                  initialAnswers={progress?.quickCheck?.answers}
                  initialScore={progress?.quickCheck?.score}
                  onAnswersChange={(answers) => saveQuickCheck(slug, answers, null)}
                  onChecked={(answers, score) => saveQuickCheck(slug, answers, score)}
                  onRetry={(answers) => saveQuickCheck(slug, answers, null)}
                />
              ) : <p className="text-small text-text-secondary">Restoring your Quick check...</p>}
            </section>
          )}
        </div>
        <aside className="space-y-4 min-[900px]:sticky min-[900px]:top-[104px]">
          <section className="card">
            <h2 className="section-label">Key terms</h2>
            <div className="flex flex-wrap gap-2">{lesson.key_terms.map((item) => <button key={item} type="button" className="filter-chip gap-1.5 px-3" aria-pressed={term === item} aria-expanded={term === item} aria-controls="term-explanation" onClick={() => setTerm(term === item ? null : item)}>{item}<Icon name="external" size={12} /></button>)}</div>
            <div id="term-explanation" aria-live="polite">{term && <div className="mt-4 rounded-default bg-surface-1 p-3"><h3 className="text-small font-medium">{term}</h3><p className="mt-1 text-small leading-6 text-text-secondary">{glossary[term]}</p></div>}</div>
          </section>
          <section className="card"><h2 className="section-label">Where you&apos;ll see it</h2><ul className="space-y-3 text-small text-text-secondary">{lesson.used_in.map((item) => <li key={item} className="flex items-start gap-2"><Icon name="layers" size={16} className="mt-0.5 shrink-0" />{item}</li>)}</ul></section>
          <section className="card"><h2 className="section-label">Go deeper</h2><a className="text-link items-start leading-6" href={lesson.go_deeper.url} target="_blank" rel="noopener noreferrer">{lesson.go_deeper.title}<Icon name="external" size={14} className="mt-1 shrink-0" /></a></section>
        </aside>
      </div>
      <div className="mt-7 border-t border-border pt-5">
        <div className="flex items-center justify-between gap-3">
          <button type="button" className="btn-secondary" disabled={!ready || currentStep === 0} onClick={() => visitStep(slug, currentStep - 1)}><Icon name="left" size={16} /><span className="hidden sm:inline">{STEP_NAMES[Math.max(0, currentStep - 1)]}</span><span className="sm:hidden">Back</span></button>
          {currentStep < 4 ? <button type="button" className="btn-primary" disabled={!ready} onClick={() => completeStep(slug, currentStep)}>Complete &amp; next<Icon name="right" size={16} /></button> : <button type="button" className="btn-primary" disabled={!quizReady || !canCompleteLesson(progress, lesson.quiz.length)} onClick={finish}>Mark as learned<Icon name="check" size={16} /></button>}
        </div>
        <p className="mt-3 text-caption text-text-secondary">{currentStep === 4 ? "Complete each reading section and answer every quiz question correctly to finish." : "Complete & next confirms this section. Tabs and Back only switch sections."} Your progress is saved on this device.</p>
      </div>
    </main>
  );
}
