"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { useLearning } from "./LearningProvider";
import { ProfileMenu } from "./ProfileMenu";

const links = [
  { href: "/", label: "Today", icon: "home" },
  { href: "/library", label: "Library", icon: "library" },
  { href: "/progress", label: "Progress", icon: "chart" },
] as const;

export function Navigation() {
  const pathname = usePathname();
  const { stats } = useLearning();
  const active = (href: string) => href === "/" ? pathname === "/" || pathname.startsWith("/lesson/") : pathname === href;
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-border bg-surface-2 md:rounded-t-card">
        <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between gap-4 px-5 md:grid md:h-20 md:grid-cols-[1fr_auto_1fr] md:px-8">
          <Link href="/" className="inline-flex w-fit items-center gap-2.5 text-xl font-medium tracking-tight" aria-label="Spinlearn home">
            <Icon name="brain" size={28} className="text-accent-text" />
            Spinlearn
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} aria-current={active(link.href) ? "page" : undefined} className={`py-3 text-body ${active(link.href) ? "font-medium text-text-primary" : "text-text-secondary hover:text-accent-text"}`}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-3">
            <Link href="/progress" className="badge bg-warning-bg text-warning-text" aria-label={`${stats.streak}-day streak. View progress.`}>
              <Icon name="flame" size={16} />
              <span>{stats.streak}<span className="hidden lg:inline">-day streak</span></span>
            </Link>
            <ProfileMenu />
          </div>
        </div>
      </header>
      <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-surface-2 px-4 pt-2 md:hidden" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} aria-current={active(link.href) ? "page" : undefined} className={`flex min-h-12 min-w-20 flex-col items-center justify-center gap-1 rounded-default px-4 text-caption ${active(link.href) ? "text-accent-text" : "text-text-secondary"}`}>
            <Icon name={link.icon} size={22} />
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
