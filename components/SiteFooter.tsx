import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-border py-5 text-caption text-text-secondary md:mx-8">
      <span>One idea. A little progress, every day.</span>
      <nav aria-label="Footer" className="flex flex-wrap gap-4">
        <Link href="/privacy" className="hover:text-accent-text">Privacy policy</Link>
        <Link href="/declaration" className="hover:text-accent-text">Declaration &amp; terms</Link>
        <a href="mailto:spinlearn025@gmail.com" className="hover:text-accent-text">Contact</a>
      </nav>
    </footer>
  );
}
