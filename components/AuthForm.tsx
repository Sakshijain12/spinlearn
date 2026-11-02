"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { z } from "zod";
import { Icon } from "./Icon";
import { authResponseSchema, loginSchema, registrationSchema } from "@/lib/auth/validation";
import { broadcastAccountChange } from "@/lib/account-storage";
import { SiteFooter } from "./SiteFooter";
import { safeReturnPath } from "@/lib/site";

const errorSchema = z.object({ error: z.object({ message: z.string() }) });

export function AuthForm({ mode, returnTo = "/" }: { mode: "login" | "register"; returnTo?: string }) {
  const registering = mode === "register";
  const [loginId, setLoginId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const form = { loginId, displayName, password, confirmPassword };
    const validated = registering ? registrationSchema.safeParse(form) : loginSchema.safeParse(form);
    if (!validated.success) {
      setError(validated.error.issues[0].message);
      return;
    }
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated.data),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        setError(errorSchema.parse(result).error.message);
        setBusy(false);
        return;
      }
      authResponseSchema.parse(result);
      setPassword("");
      setConfirmPassword("");
      broadcastAccountChange("login");
      window.location.assign(safeReturnPath(returnTo));
    } catch (cause) {
      console.error("Spinlearn could not complete the account request.", cause);
      setError("Could not reach the account service. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <main id="main-content" className="page-container flex min-h-[80dvh] items-center justify-center">
        <section className="card w-full max-w-md p-6 md:p-8" aria-labelledby="auth-title">
          <Icon name="brain" size={32} className="mx-auto mb-4 text-accent-text" />
          <p className="section-label text-center">Spinlearn</p>
          <h1 id="auth-title" className="text-center text-title font-medium tracking-tight">{registering ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-2 text-center text-small text-text-secondary">{registering ? "Choose a login ID and a password to get started." : "Enter your login ID and password to continue learning."}</p>
          <form onSubmit={submit} className="mt-6 space-y-4" aria-label={registering ? "Create account" : "Log in"} aria-busy={busy}>
            {registering && <div>
              <label htmlFor="account-name" className="mb-1.5 block text-small font-medium">Display name</label>
              <input id="account-name" name="displayName" className="field w-full" autoComplete="nickname" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} required disabled={busy} />
            </div>}
            <div>
              <label htmlFor="login-id" className="mb-1.5 block text-small font-medium">Login ID</label>
              <input id="login-id" name="username" className="field w-full" autoComplete="username" autoCapitalize="none" spellCheck={false} value={loginId} onChange={(event) => setLoginId(event.target.value)} minLength={3} maxLength={64} required disabled={busy} aria-describedby={registering ? "login-id-help" : undefined} />
              {registering && <p id="login-id-help" className="mt-1 text-caption text-text-secondary">3-64 characters. Letters, numbers, dots, underscores, hyphens, and @ are allowed.</p>}
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="account-password" className="text-small font-medium">Password</label>
                <button type="button" className="min-h-8 px-1 text-caption text-accent-text" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button>
              </div>
              <input id="account-password" name="password" className="field w-full" type={showPassword ? "text" : "password"} autoComplete={registering ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={registering ? 12 : 1} maxLength={128} required disabled={busy} aria-describedby={registering ? "password-help" : undefined} />
              {registering && <p id="password-help" className="mt-1 text-caption text-text-secondary">Use 12 or more characters. A unique passphrase works well.</p>}
            </div>
            {registering && <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-small font-medium">Confirm password</label>
              <input id="confirm-password" name="confirmPassword" className="field w-full" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} maxLength={128} required disabled={busy} />
            </div>}
            {error && <p role="alert" className="rounded-default bg-danger-bg px-3 py-2 text-small text-danger-text">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? registering ? "Creating account..." : "Logging in..." : registering ? "Create account" : "Log in"}<Icon name="right" size={16} /></button>
          </form>
          <p className="mt-5 text-center text-small text-text-secondary">
            {registering ? "Already have an account? " : "New to Spinlearn? "}
            <Link href={`${registering ? "/login" : "/register"}?next=${encodeURIComponent(safeReturnPath(returnTo))}`} className="text-link">{registering ? "Log in" : "Create account"}</Link>
          </p>
          <p className="mt-5 border-t border-border pt-4 text-caption text-text-secondary">Login is only needed to save and view personal progress. Your signed-in learning data is stored in Neon PostgreSQL and available across devices. <Link href="/" className="text-link">Continue without logging in</Link></p>
          {registering && <p className="mt-3 text-caption text-text-secondary">By creating an account, you agree to the <Link href="/declaration" className="underline">declaration and terms</Link> and acknowledge the <Link href="/privacy" className="underline">privacy policy</Link>.</p>}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
