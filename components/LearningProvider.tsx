"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getTodayDate } from "@/lib/utils";
import {
  initialLearningState, initialLessonProgress,
  learningStats, offsetDay, profileSchema, canCompleteLesson, quickCheckSchema, alignQuizProgress, type DailySpin, type LearningState, type Profile,
} from "@/lib/learning";
import type { LessonContent } from "@/lib/schemas/validation";
import { authResponseSchema, type Account } from "@/lib/auth/validation";
import { accountStorageKey, broadcastAccountChange, loadAccountLearning } from "@/lib/account-storage";
import { validateLearningBackup } from "@/lib/learning-backup";

interface LearningContextValue {
  state: LearningState;
  account: Account;
  signingOut: boolean;
  ready: boolean;
  today: string;
  stats: ReturnType<typeof learningStats>;
  toggleBookmark: (slug: string) => void;
  saveProfile: (profile: Profile) => boolean;
  saveSpin: (spin: DailySpin) => boolean;
  visitStep: (slug: string, step: number) => void;
  completeStep: (slug: string, step: number) => boolean;
  prepareQuiz: (slug: string, questions: LessonContent["quiz"], legacyQuestionIds: string[]) => void;
  saveQuiz: (slug: string, answers: number[], score: number | null, questionCount: number) => void;
  saveQuickCheck: (slug: string, answers: number[], score: number | null) => void;
  completeLesson: (slug: string, seconds: number, questionCount: number) => boolean;
  reset: () => boolean;
  importBackup: (backup: unknown) => boolean;
  signOut: () => Promise<void>;
  notify: (message: string) => void;
}

const LearningContext = createContext<LearningContextValue | null>(null);

export function LearningProvider({ children, account }: { children: ReactNode; account: Account }) {
  const [state, setState] = useState(() => {
    const initial = initialLearningState();
    initial.profile.displayName = account.displayName;
    return initial;
  });
  const storageKey = accountStorageKey(account.id);
  const stateRef = useRef(state);
  const writable = useRef(false);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const load = () => {
      try {
        const next = loadAccountLearning(localStorage, account);
        stateRef.current = next;
        setState(next);
        writable.current = true;
        setError("");
      } catch (cause) {
        console.error("Spinlearn could not load local learning data.", cause);
        writable.current = false;
        setError("Your saved data could not be loaded. Allow browser storage and reload, or reset local data in Settings.");
      }
      setReady(true);
    };
    load();
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [account, storageKey]);

  useEffect(() => {
    const verifySession = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }
        if (!response.ok) throw new Error(`Session check failed (${response.status}).`);
        const result = authResponseSchema.parse(await response.json());
        if (result.account.id !== account.id) window.location.reload();
      } catch (cause) {
        console.error("Spinlearn could not verify the account session.", cause);
        setError("Your login session could not be checked. Reload the page before continuing.");
      }
    };
    document.addEventListener("visibilitychange", verifySession);
    return () => document.removeEventListener("visibilitychange", verifySession);
  }, [account.id]);

  useEffect(() => {
    if (!ready) return;
    const update = () => setToday(getTodayDate(state.profile.timezone));
    update();
    const timer = window.setInterval(update, 30000);
    return () => window.clearInterval(timer);
  }, [ready, state.profile.timezone]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const commit = useCallback((update: (current: LearningState) => LearningState): boolean => {
    if (!writable.current) {
      setError("Local storage is unavailable. Allow browser storage or reset unreadable data in Settings before saving.");
      return false;
    }
    const next = update(stateRef.current);
    if (next === stateRef.current) return true;
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      stateRef.current = next;
      setState(next);
      setError("");
      return true;
    } catch (cause) {
      console.error("Spinlearn could not save local learning data.", cause);
      setError("Your changes could not be saved. Free some browser storage, then try again.");
      return false;
    }
  }, [storageKey]);

  const toggleBookmark = useCallback((slug: string) => {
    const saved = stateRef.current.bookmarks.includes(slug);
    if (commit((current) => ({
      ...current,
      bookmarks: saved ? current.bookmarks.filter((item) => item !== slug) : [...current.bookmarks, slug],
    }))) setNotice(saved ? "Removed from saved topics" : "Saved for later");
  }, [commit]);

  const saveProfile = useCallback((profile: Profile) => {
    const validated = profileSchema.safeParse(profile);
    if (!validated.success) {
      setError(validated.error.issues[0].message);
      return false;
    }
    const saved = commit((current) => ({ ...current, profile: validated.data }));
    if (saved) setNotice("Settings saved on this device");
    return saved;
  }, [commit]);

  const saveSpin = useCallback((spin: DailySpin) => commit((current) => ({ ...current, spin })), [commit]);

  const visitStep = useCallback((slug: string, step: number) => {
    commit((current) => {
      const progress = current.progress[slug] ?? initialLessonProgress();
      if (progress.step === step && progress.visited.includes(step)) return current;
      return {
        ...current,
        progress: {
          ...current.progress,
          [slug]: { ...progress, step, visited: [...new Set([...progress.visited, step])] },
        },
      };
    });
  }, [commit]);

  const completeStep = useCallback((slug: string, step: number) => {
    if (!Number.isInteger(step) || step < 0 || step >= 4) {
      setError("Confirm a reading section with Complete & next. Complete Quiz by checking all answers correctly.");
      return false;
    }
    return commit((current) => {
      const progress = current.progress[slug] ?? initialLessonProgress();
      return {
        ...current,
        progress: {
          ...current.progress,
          [slug]: {
            ...progress,
            step: step + 1,
            visited: [...new Set([...progress.visited, step, step + 1])],
            completedSteps: [...new Set([...progress.completedSteps, step])],
          },
        },
      };
    });
  }, [commit]);

  const prepareQuiz = useCallback((slug: string, questions: LessonContent["quiz"], legacyQuestionIds: string[]) => {
    const previous = stateRef.current.progress[slug] ?? initialLessonProgress();
    const aligned = alignQuizProgress(previous, questions, legacyQuestionIds);
    if (aligned === previous) return;
    const saved = commit((current) => ({
      ...current, progress: { ...current.progress, [slug]: aligned },
    }));
    if (saved && previous.answers.length) {
      setNotice(aligned.answers.length
        ? "Quiz updated: matching answers kept and scored for the remaining questions. Earlier results are preserved."
        : "Quiz questions changed. Start a new attempt; earlier results are preserved.");
    }
  }, [commit]);

  const saveQuiz = useCallback((slug: string, answers: number[], score: number | null, questionCount: number) => {
    if (
      !Number.isInteger(questionCount) || questionCount < 1
      || (score === null ? answers.length !== 0 : (
        !Number.isFinite(score) || score < 0 || score > 1
        || answers.length !== questionCount
        || answers.some((answer) => !Number.isInteger(answer) || answer < 0 || answer > 3)
      ))
    ) {
      setError("Your quiz result could not be saved. Answer every question and check the answers again.");
      return;
    }
    commit((current) => {
      const progress = current.progress[slug] ?? initialLessonProgress();
      const readingSteps = progress.completedSteps.filter((step) => step !== 4);
      return {
        ...current,
        progress: {
          ...current.progress,
          [slug]: { ...progress, answers, score, completedSteps: score === 1 ? [...readingSteps, 4] : readingSteps },
        },
      };
    });
  }, [commit]);

  const saveQuickCheck = useCallback((slug: string, answers: number[], score: number | null) => {
    const validated = quickCheckSchema.safeParse({ answers, score });
    if (!validated.success) {
      setError("Your Quick check could not be saved. Select an answer and try again.");
      return;
    }
    commit((current) => ({
      ...current,
      progress: {
        ...current.progress,
        [slug]: { ...(current.progress[slug] ?? initialLessonProgress()), quickCheck: validated.data },
      },
    }));
  }, [commit]);

  const completeLesson = useCallback((slug: string, seconds: number, questionCount: number) => {
    const progress = stateRef.current.progress[slug];
    if (!progress || progress.score === null || !canCompleteLesson(progress, questionCount)) {
      setError("Complete each reading section and answer every quiz question correctly before finishing the lesson.");
      return false;
    }
    const date = getTodayDate(stateRef.current.profile.timezone);
    const score = progress.score;
    const saved = commit((current) => ({
      ...current,
      progress: {
        ...current.progress,
        [slug]: {
          ...progress,
          completedAt: new Date().toISOString(),
          dueDate: offsetDay(date, score >= 0.8 ? 7 : score >= 0.5 ? 3 : 1),
        },
      },
      activity: [...current.activity, {
        slug, date, correct: Math.round(score * progress.answers.length),
        total: progress.answers.length, seconds: Math.min(1800, Math.max(0, seconds)),
      }],
    }));
    if (saved) setNotice("Lesson added to your progress");
    return saved;
  }, [commit]);

  const reset = useCallback(() => {
    try {
      const next = initialLearningState();
      next.profile.displayName = account.displayName;
      localStorage.setItem(storageKey, JSON.stringify(next));
      stateRef.current = next;
      setState(next);
      writable.current = true;
      setError("");
      setNotice("Local learning data cleared");
      return true;
    } catch (cause) {
      console.error("Spinlearn could not clear local learning data.", cause);
      setError("Local data could not be cleared. Check your browser storage permissions and try again.");
      return false;
    }
  }, [account.displayName, storageKey]);

  const importBackup = useCallback((backup: unknown) => {
    let restored: LearningState;
    try {
      restored = validateLearningBackup(backup, account.id).state;
    } catch (cause) {
      console.error("Spinlearn could not validate the learning backup.", cause);
      setError(cause instanceof Error ? cause.message : "The learning backup could not be validated.");
      return false;
    }
    const saved = commit(() => ({ ...restored, previewEnded: false }));
    if (saved) setNotice("Learning backup restored for this account");
    return saved;
  }, [account.id, commit]);

  const signOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error(`Sign-out failed (${response.status}).`);
      broadcastAccountChange("logout");
      window.location.assign("/signed-out");
    } catch (cause) {
      console.error("Spinlearn could not sign out.", cause);
      setError("Sign out could not be completed. Check your connection and try again.");
      setSigningOut(false);
    }
  }, [signingOut]);

  return (
    <LearningContext.Provider value={{
      state, account, ready, today, signingOut, stats: learningStats(state, today), toggleBookmark,
      saveProfile, saveSpin, visitStep, completeStep, prepareQuiz, saveQuiz, saveQuickCheck, completeLesson, reset, importBackup, signOut, notify: setNotice,
    }}>
      {error && <div role="alert" className="border-b border-danger-text/20 bg-danger-bg px-5 py-3 text-small text-danger-text">{error}</div>}
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className={notice ? "fixed bottom-24 left-1/2 z-50 w-max max-w-[calc(100%-32px)] -translate-x-1/2 rounded-default border border-border bg-surface-2 px-5 py-3 text-small text-text-primary md:bottom-8" : "sr-only"}>
        {notice}
      </div>
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) throw new Error("useLearning must be used within LearningProvider.");
  return context;
}
