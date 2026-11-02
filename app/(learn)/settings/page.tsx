"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useLearning } from "@/components/LearningProvider";
import { profileSchema } from "@/lib/learning";
import { createLearningBackup, validateLearningBackup, type LearningBackup } from "@/lib/learning-backup";

const timezones = ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Kolkata", "Asia/Tokyo", "Asia/Hong_Kong", "Australia/Sydney"];

export default function SettingsPage() {
  const { state, ready, stats, saveProfile, reset, account, importBackup } = useLearning();
  const [displayName, setDisplayName] = useState(state.profile.displayName);
  const [timezone, setTimezone] = useState(state.profile.timezone);
  const [formError, setFormError] = useState("");
  const [resetError, setResetError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const restoreDialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [backupError, setBackupError] = useState("");
  const [pendingBackup, setPendingBackup] = useState<LearningBackup | null>(null);

  useEffect(() => {
    setDisplayName(state.profile.displayName);
    setTimezone(state.profile.timezone);
  }, [state.profile.displayName, state.profile.timezone]);

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = profileSchema.safeParse({ displayName, timezone });
    if (!result.success) {
      setFormError(result.error.issues[0].message);
      return;
    }
    setFormError("");
    saveProfile(result.data);
  };

  const handleReset = () => {
    if (reset()) {
      setResetError("");
      dialog.current?.close();
    } else {
      setResetError("Your data could not be cleared. Check browser storage permissions and try again.");
    }
  };

  const downloadBackup = () => {
    try {
      const backup = createLearningBackup(account.id, state);
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `spinlearn-backup-${account.id}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setBackupError("");
    } catch (cause) {
      console.error("Spinlearn could not export a learning backup.", cause);
      setBackupError("The backup could not be downloaded. Try again in this browser.");
    }
  };

  const readBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBackupError("");
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("Choose a backup smaller than 2 MB.");
      const parsed: unknown = JSON.parse(await file.text());
      setPendingBackup(validateLearningBackup(parsed, account.id));
      restoreDialog.current?.showModal();
    } catch (cause) {
      console.error("Spinlearn could not read a learning backup.", cause);
      setBackupError(cause instanceof SyntaxError ? "The selected file is not valid JSON." : cause instanceof Error ? cause.message : "The backup could not be read.");
    }
  };

  const restoreBackup = () => {
    if (!pendingBackup) return;
    if (importBackup(pendingBackup)) {
      restoreDialog.current?.close();
      setPendingBackup(null);
      setBackupError("");
    } else {
      setBackupError("Your backup could not be restored. Check the storage notice and try again.");
    }
  };

  return (
    <main id="main-content" className="page-container">
      <header className="mb-6">
        <h1 className="text-title font-medium tracking-tight">Settings</h1>
        <p className="mt-2 text-small text-text-secondary">Make a little space for your daily learning habit.</p>
      </header>
      <div className="grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <form id="profile" className="card scroll-mt-24" aria-labelledby="profile-title" onSubmit={handleSave}>
            <h2 id="profile-title" className="section-label">Your profile</h2>
            <div className="space-y-5">
              <div>
                <label htmlFor="display-name" className="mb-2 block text-small font-medium">Display name</label>
                <input id="display-name" name="displayName" className="field w-full" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} required disabled={!ready} autoComplete="nickname" aria-describedby="name-help" aria-invalid={Boolean(formError)} />
                <p id="name-help" className="mt-1.5 text-caption text-text-secondary">A familiar name for your learning space. {displayName.length}/40</p>
              </div>
              <div>
                <label htmlFor="timezone" className="mb-2 block text-small font-medium">Timezone</label>
                <select id="timezone" className="field w-full" value={timezone} onChange={(event) => setTimezone(event.target.value)} disabled={!ready} aria-describedby="timezone-help">
                  {[...new Set([...timezones, state.profile.timezone])].map((zone) => <option key={zone} value={zone}>{zone.replace(/_/g, " ").replace("/", " / ")}</option>)}
                </select>
                <p id="timezone-help" className="mt-1.5 text-caption text-text-secondary">Your daily spin and streak follow midnight in this timezone.</p>
              </div>
              {formError && <p role="alert" className="text-small text-danger-text">{formError}</p>}
              <div className="border-t border-border pt-4"><button type="submit" className="btn-primary" disabled={!ready}>Save changes<Icon name="check" size={16} /></button></div>
            </div>
          </form>
          <section className="card" aria-labelledby="backup-title">
            <h2 id="backup-title" className="section-label">Move your learning data</h2>
            <p className="text-small text-text-secondary">Download a backup before moving from localhost to your deployed site. Sign in to the same migrated account there and import it. Passwords and login sessions are not included.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="btn-secondary" disabled={!ready} onClick={downloadBackup}><Icon name="download" size={16} />Download learning backup</button>
              <button type="button" className="btn-secondary" disabled={!ready} onClick={() => fileInput.current?.click()}>Import learning backup</button>
              <input ref={fileInput} type="file" accept=".json,application/json" aria-label="Choose learning backup" className="hidden" onChange={readBackup} />
            </div>
            <p className="mt-3 text-caption text-text-secondary">Keep your backup private. Importing replaces only this account&apos;s browser-local progress, not its password or other accounts.</p>
            {backupError && <p role="alert" className="mt-3 text-small text-danger-text">{backupError}</p>}
          </section>
          <section className="card">
            <h2 className="section-label">Daily reminders</h2>
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="text-small font-medium">A nudge to learn something new</h3><p id="reminder-help" className="mt-2 text-small text-text-secondary">Email delivery isn&apos;t connected in this local preview. No reminders will be sent.</p></div>
              <input type="checkbox" role="switch" aria-label="Daily email reminders" aria-describedby="reminder-help" disabled checked={false} readOnly className="mt-1 h-5 w-5 shrink-0 accent-accent-fill" />
            </div>
          </section>
          <section className="card">
            <h2 className="section-label">Start fresh</h2>
            <p className="text-small text-text-secondary">Clear this browser&apos;s profile, saved topics, daily spins, and learning history. This cannot be undone.</p>
            <button type="button" className="btn-secondary mt-4 border-danger-text/30 text-danger-text hover:border-danger-text hover:bg-danger-bg" onClick={() => { setResetError(""); dialog.current?.showModal(); }}>Reset local data</button>
          </section>
        </div>
        <aside className="space-y-4">
          <section className="card">
            <Icon name="layers" size={26} className="mb-4 text-accent-text" />
            <h2 className="text-base font-medium">Your learning, on this device</h2>
            <p className="mt-2 text-small text-text-secondary">Signed in as <span className="break-all font-medium">{account.loginId}</span>. Your profile and progress are stored separately for this account in this browser. Learning data isn&apos;t synced across devices.</p>
            <dl className="mt-5 space-y-3 border-t border-border pt-4 text-small">
              <div className="flex justify-between"><dt className="text-text-secondary">Saved topics</dt><dd>{state.bookmarks.length}</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Lessons completed</dt><dd>{stats.learned}</dd></div>
            </dl>
          </section>
          <section className="card">
            <h2 className="section-label">Keep your curiosity going</h2>
            <p className="text-small text-text-secondary">Every topic includes five learning steps, a worked example, runnable Python, a glossary, and a quiz. Explore everything from foundations to modern language models.</p>
            <Link href="/library" className="text-link mt-4">Explore the library<Icon name="right" size={15} /></Link>
          </section>
        </aside>
      </div>
      <dialog ref={dialog} className="m-auto w-[calc(100%-40px)] max-w-md rounded-card border border-border bg-surface-2 p-6 text-text-primary" aria-labelledby="reset-title" aria-describedby="reset-description">
        <h2 id="reset-title" className="text-heading font-medium">Reset your learning space?</h2>
        <p id="reset-description" className="mt-3 text-small text-text-secondary">Your profile, bookmarks, spins, and progress will be removed from this browser. There is no undo.</p>
        {resetError && <p role="alert" className="mt-3 text-small text-danger-text">{resetError}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => dialog.current?.close()}>Keep my data</button>
          <button type="button" className="btn-secondary border-danger-text bg-danger-bg text-danger-text" onClick={handleReset}>Reset local data</button>
        </div>
      </dialog>
      <dialog ref={restoreDialog} onClose={() => setPendingBackup(null)} className="m-auto w-[calc(100%-40px)] max-w-md rounded-card border border-border bg-surface-2 p-6 text-text-primary" aria-labelledby="restore-title" aria-describedby="restore-description">
        <h2 id="restore-title" className="text-heading font-medium">Restore this learning backup?</h2>
        <p id="restore-description" className="mt-3 text-small text-text-secondary">This replaces your current profile preferences, bookmarks, spins, and learning history in this browser. Download a backup of your current data first if you want to keep it.</p>
        {backupError && <p role="alert" className="mt-3 text-small text-danger-text">{backupError}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => restoreDialog.current?.close()}>Cancel</button>
          <button type="button" className="btn-primary" onClick={restoreBackup}>Restore backup</button>
        </div>
      </dialog>
    </main>
  );
}
