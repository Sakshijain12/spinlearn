import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { currentAccount } from "@/lib/auth/session";
import { SiteFooter } from "@/components/SiteFooter";
import { PRIVATE_ROBOTS } from "@/lib/site";

export const metadata = { title: "Signed out", robots: PRIVATE_ROBOTS };

export default async function SignedOutPage() {
  if (await currentAccount()) redirect("/");
  return (
    <div className="app-shell">
      <main id="main-content" className="page-container flex min-h-[70dvh] items-center justify-center">
        <section className="card w-full max-w-md p-6 text-center md:p-8" aria-labelledby="signed-out-title">
          <Icon name="brain" size={32} className="mx-auto mb-5 text-accent-text" />
          <p className="section-label">Spinlearn</p>
          <h1 id="signed-out-title" className="text-title font-medium tracking-tight">You&apos;re signed out</h1>
          <p className="mt-4 text-small text-text-secondary">Your account progress is saved on the server. You can continue learning without logging in, or log in again to track your progress.</p>
          <Link href="/login" className="btn-primary mt-6">Login again<Icon name="right" size={16} /></Link>
          <Link href="/" className="text-link mt-5 block">Continue learning without logging in</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
