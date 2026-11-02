import { LearningProvider } from "@/components/LearningProvider";
import { Navigation } from "@/components/Navigation";
import { currentAccount } from "@/lib/auth/session";
import { SiteFooter } from "@/components/SiteFooter";

export default async function LearningLayout({ children }: { children: React.ReactNode }) {
  const account = await currentAccount();
  return (
    <LearningProvider key={account?.id ?? "guest"} account={account}>
      <div className="app-shell">
        <Navigation />
        {children}
        <SiteFooter />
      </div>
    </LearningProvider>
  );
}
