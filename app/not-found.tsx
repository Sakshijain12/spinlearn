import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function NotFound() {
  return (
    <main id="main-content" className="page-container py-20 text-center">
      <p className="section-label">404 &middot; Page not found</p>
      <h1 className="text-title font-medium tracking-tight">Let&apos;s find your next idea</h1>
      <p className="mx-auto mt-3 max-w-md text-small text-text-secondary">This page isn&apos;t here. Head back to today or explore the learning library.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/" className="btn-primary">Back to today<Icon name="right" size={16} /></Link><Link href="/library" className="btn-secondary">Browse the library</Link></div>
    </main>
  );
}
