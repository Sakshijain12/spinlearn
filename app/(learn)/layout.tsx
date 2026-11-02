import Link from "next/link";
import { LearningProvider } from "@/components/LearningProvider";
import { Navigation } from "@/components/Navigation";
import { requireAccount } from "@/lib/auth/session";

export default async function LearningLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAccount();
  return (
    <LearningProvider key={account.id} account={account}>
      <div className="app-shell">
        <Navigation />
        {children}
        <footer className="mx-5 flex flex-wrap items-center justify-between gap-2 border-t border-border py-5 text-caption text-text-secondary md:mx-8">
          <span>One idea. A little progress, every day.</span>
          <Link href="/settings" className="hover:text-accent-text">Learning data saved on this device</Link>
        </footer>
      </div>
    </LearningProvider>
  );
}
