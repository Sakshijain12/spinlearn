"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { z } from "zod";
import { generateId, getTodayDate } from "@/lib/utils";
import { initialLearningState, learningStats, quizMatches, type DailySpin, type LearningState, type Profile } from "@/lib/learning";
import {
  applyLearningAction, learningActionSchema, learningSnapshotSchema,
  type LearningAction, type LearningSnapshot,
} from "@/lib/learning-actions";
import type { LessonContent } from "@/lib/schemas/validation";
import type { Account } from "@/lib/auth/validation";
import { broadcastAccountChange, readPreviousBrowserLearning } from "@/lib/account-storage";
import { validateLearningBackup } from "@/lib/learning-backup";

interface LearningContextValue {
  state: LearningState;
  account: Account | null;
  signingOut: boolean;
  ready: boolean;
  saving: boolean;
  today: string;
  stats: ReturnType<typeof learningStats>;
  toggleBookmark: (slug: string) => Promise<boolean>;
  saveProfile: (profile: Profile) => Promise<boolean>;
  saveSpin: (spin: DailySpin) => Promise<boolean>;
  visitStep: (slug: string, step: number) => Promise<boolean>;
  completeStep: (slug: string, step: number) => Promise<boolean>;
  prepareQuiz: (lesson: LessonContent) => Promise<boolean>;
  saveQuiz: (lesson: LessonContent, answers: number[] | null) => Promise<boolean>;
  saveQuickCheck: (lesson: LessonContent, answers: number[], checked: boolean) => Promise<boolean>;
  completeLesson: (lesson: LessonContent, seconds: number) => Promise<boolean>;
  reset: () => Promise<boolean>;
  importBackup: (backup: unknown) => Promise<boolean>;
  signOut: () => Promise<void>;
  notify: (message: string) => void;
}

const LearningContext = createContext<LearningContextValue | null>(null);
const failureSchema = z.object({ error: z.object({ message: z.string() }) });

export function LearningProvider({ children, account }: { children: ReactNode; account: Account | null }) {
  const [state, setState] = useState(() => {
    const initial = initialLearningState();
    initial.profile.displayName = account?.displayName ?? "Guest";
    return initial;
  });
  const pathname = usePathname();
  const stateRef = useRef(state);
  const revision = useRef(0);
  const writable = useRef(false);
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const channel = useRef<BroadcastChannel | null>(null);
  const pendingSave = useRef(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [today, setToday] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [browserProgress, setBrowserProgress] = useState<LearningState | null>(null);

  const acceptSnapshot = useCallback((snapshot: LearningSnapshot) => {
    if (snapshot.accountId !== account?.id) {
      window.location.reload();
      return;
    }
    if (snapshot.revision < revision.current) return;
    revision.current = snapshot.revision;
    stateRef.current = snapshot.state;
    setState(snapshot.state);
  }, [account?.id]);

  const refresh = useCallback(async () => {
    if (!account) {
      writable.current = true;
      setReady(true);
      return;
    }
    try {
      const response = await fetch("/api/v1/learning", { cache: "no-store" });
      if (response.status === 401) {
        writable.current = false;
        window.location.reload();
        return;
      }
      if (!response.ok) throw new Error("Your server progress could not be loaded. Try again; it has not been replaced.");
      const snapshot = learningSnapshotSchema.parse(await response.json());
      if (snapshot.accountId !== account.id) { window.location.reload(); return; }
      if (snapshot.revision < revision.current) return;
      acceptSnapshot(snapshot);
      writable.current = true;
      setError("");
      if (snapshot.revision === 0) {
        try {
          const previous = readPreviousBrowserLearning(localStorage, account.id);
          if (previous) {
            setBrowserProgress(previous);
            setReady(false);
            return;
          }
        } catch (cause) {
          console.error("Spinlearn could not read previous browser progress.", cause);
          setNotice("Previous browser data could not be read. You can import a learning backup in Settings.");
        }
      }
      setBrowserProgress(null);
      setReady(true);
    } catch (cause) {
      console.error("Spinlearn could not sync learning data.", cause);
      writable.current = false;
      setReady(false);
      setError(cause instanceof Error ? cause.message : "Server progress could not be loaded. Try again.");
    }
  }, [account, acceptSnapshot]);

  useEffect(() => {
    void refresh();
    if (!account) return;
    const visible = () => { if (document.visibilityState === "visible" && !pendingSave.current) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    if (typeof BroadcastChannel !== "undefined") {
      const sync = new BroadcastChannel(`spinlearn-learning-${account.id}`);
      channel.current = sync;
      sync.onmessage = () => { void refresh(); };
    }
    return () => {
      document.removeEventListener("visibilitychange", visible);
      channel.current?.close();
      channel.current = null;
    };
  }, [refresh, account]);

  useEffect(() => {
    if (!ready) return;
    const update = () => setToday(getTodayDate(state.profile.timezone));
    update();
    const timer = window.setInterval(update, 30000);
    return () => window.clearInterval(timer);
  }, [ready, state.profile.timezone]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const send = useCallback((action: LearningAction, lesson?: LessonContent): Promise<boolean> => {
    const requestId = generateId();
    const run = async () => {
      if (!writable.current) {
        setError("Progress is not ready to save. Retry loading it before making changes.");
        return false;
      }
      setSaving(true);
      pendingSave.current = true;
      try {
        const validated = learningActionSchema.parse(action);
        if (!account) {
          const next = applyLearningAction(stateRef.current, validated, { requestId, now: new Date(), lesson });
          stateRef.current = next;
          setState(next);
        } else {
          const response = await fetch("/api/v1/learning", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accountId: account.id, requestId, action: validated, expectedRevision: revision.current }),
          });
          const data: unknown = await response.json();
          if (!response.ok) {
            if (response.status === 401) writable.current = false;
            const failure = failureSchema.safeParse(data);
            throw new Error(failure.success ? failure.data.error.message : "Your change could not be saved to the server.");
          }
          acceptSnapshot(learningSnapshotSchema.parse(data));
          channel.current?.postMessage({ revision: revision.current });
        }
        setError("");
        return true;
      } catch (cause) {
        console.error("Spinlearn could not save a learning action.", cause);
        setError(cause instanceof Error ? cause.message : "Your change could not be saved. Try again.");
        if (account) {
          writable.current = false;
          setReady(false);
        }
        return false;
      } finally {
        setSaving(false);
        pendingSave.current = false;
      }
    };
    const next = queue.current.then(run);
    queue.current = next;
    return next;
  }, [account, acceptSnapshot]);

  const toggleBookmark = useCallback(async (slug: string) => {
    if (!account) {
      window.location.assign(`/login?next=${encodeURIComponent(pathname)}`);
      return false;
    }
    const saved = !stateRef.current.bookmarks.includes(slug);
    const success = await send({ type: "bookmark", slug, saved });
    if (success) setNotice(saved ? "Saved to your account" : "Removed from saved topics");
    return success;
  }, [account, pathname, send]);
  const saveProfile = useCallback(async (profile: Profile) => {
    const success = await send({ type: "profile", profile });
    if (success) setNotice("Profile saved to your account");
    return success;
  }, [send]);
  const saveSpin = useCallback((spin: DailySpin) => send({ type: "spin", spin }), [send]);
  const visitStep = useCallback((slug: string, step: number) => {
    const progress = stateRef.current.progress[slug];
    if (progress?.step === step && progress.visited.includes(step)) return Promise.resolve(true);
    return send({ type: "visit", slug, step });
  }, [send]);
  const completeStep = useCallback((slug: string, step: number) => send({ type: "complete-step", slug, step }), [send]);
  const prepareQuiz = useCallback((lesson: LessonContent) => {
    const progress = stateRef.current.progress[lesson.slug];
    if (quizMatches(progress, lesson.quiz) && (progress?.score === null || progress?.quizAttemptId)) return Promise.resolve(true);
    return send({ type: "prepare-quiz", slug: lesson.slug }, lesson);
  }, [send]);
  const saveQuiz = useCallback((lesson: LessonContent, answers: number[] | null) => send({ type: "quiz", slug: lesson.slug, answers }, lesson), [send]);
  const saveQuickCheck = useCallback((lesson: LessonContent, answers: number[], checked: boolean) =>
    send({ type: "quick-check", slug: lesson.slug, answers, checked }, lesson), [send]);
  const completeLesson = useCallback((lesson: LessonContent, seconds: number) =>
    send({ type: "complete-lesson", slug: lesson.slug, seconds: Math.min(1800, Math.max(0, seconds)) }, lesson), [send]);
  const reset = useCallback(() => send({ type: "reset" }), [send]);
  const importBackup = useCallback(async (backup: unknown) => {
    try {
      if (!account) throw new Error("Log in before importing account progress.");
      const validated = validateLearningBackup(backup, account.id);
      const success = await send({ type: "restore", state: validated.state });
      if (success) setNotice("Learning backup restored to your account");
      return success;
    } catch (cause) {
      console.error("Spinlearn could not validate the learning backup.", cause);
      setError(cause instanceof Error ? cause.message : "The backup could not be validated.");
      return false;
    }
  }, [account, send]);

  const chooseBrowserMigration = async (upload: boolean) => {
    const action: LearningAction = upload && browserProgress
      ? { type: "import-browser", state: browserProgress } : { type: "skip-browser-import" };
    if (await send(action)) {
      setBrowserProgress(null);
      setReady(true);
      setNotice(upload ? "Previous browser progress saved to your account" : "Using server progress. Your old browser data is unchanged.");
    }
  };
  const signOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await queue.current;
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out could not be completed. Try again.");
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
      state, account, ready, saving, today, signingOut, stats: learningStats(state, today), toggleBookmark,
      saveProfile, saveSpin, visitStep, completeStep, prepareQuiz, saveQuiz, saveQuickCheck,
      completeLesson, reset, importBackup, signOut, notify: setNotice,
    }}>
      {error && <div role="alert" className="border-b border-danger-text/20 bg-danger-bg px-5 py-3 text-small text-danger-text">{error} <button type="button" className="ml-2 underline" disabled={saving} onClick={() => { void refresh(); }}>Retry sync</button> <Link href="/login" className="ml-2 underline">Log in</Link></div>}
      {browserProgress && <section aria-label="Previous browser progress" className="border-b border-border bg-accent-bg px-5 py-4 text-small text-accent-text">
        <p>Previous learning data was found in this browser. Upload it to your account so you can access it on other devices?</p>
        <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={saving} className="btn-primary" onClick={() => { void chooseBrowserMigration(true); }}>Upload browser progress</button><button type="button" disabled={saving} className="btn-secondary" onClick={() => { void chooseBrowserMigration(false); }}>Start with server progress</button></div>
      </section>}
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className={notice ? "fixed bottom-24 left-1/2 z-50 w-max max-w-[calc(100%-32px)] -translate-x-1/2 rounded-default border border-border bg-surface-2 px-5 py-3 text-small text-text-primary md:bottom-8" : "sr-only"}>{notice}</div>
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) throw new Error("useLearning must be used within LearningProvider.");
  return context;
}
