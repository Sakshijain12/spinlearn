import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { currentAccount } from "@/lib/auth/session";

export default async function SignedOutPage() {
  if (await currentAccount()) redirect("/");
  return (
    <div className="app-shell">
      <main id="main-content" className="page-container flex min-h-[70dvh] items-center justify-center">
        <section className="card w-full max-w-md p-6 text-center md:p-8" aria-labelledby="signed-out-title">
          <Icon name="brain" size={32} className="mx-auto mb-5 text-accent-text" />
          <p className="section-label">Spinlearn</p>
          <h1 id="signed-out-title" className="text-title font-medium tracking-tight">You&apos;re signed out</h1>
          <p className="mt-4 text-small text-text-secondary">Your profile, saved topics, and learning progress are still saved. Log in to your account to continue.</p>
          <Link href="/login" className="btn-primary mt-6">Login again<Icon name="right" size={16} /></Link>
          <p className="mt-5 text-caption text-text-secondary">First time using accounts? Create one from the login screen. Your existing preview progress will be kept for the first account used in this browser.</p>
        </section>
      </main>
    </div>
  );
}
