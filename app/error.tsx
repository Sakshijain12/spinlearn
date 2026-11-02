"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Spinlearn could not render this page.", error); }, [error]);
  return (
    <main id="main-content" className="page-container py-20 text-center">
      <Icon name="info" size={30} className="mx-auto mb-4 text-warning-text" />
      <h1 className="text-title font-medium tracking-tight">This page couldn&apos;t load</h1>
      <p className="mx-auto mt-3 max-w-md text-small text-text-secondary">Try loading it again. Your saved learning data hasn&apos;t been cleared.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" className="btn-primary" onClick={reset}>Try again<Icon name="rotate" size={16} /></button><Link href="/" className="btn-secondary">Back to today</Link></div>
    </main>
  );
}
