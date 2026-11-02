import type { Metadata, Viewport } from "next";
import { SessionSync } from "@/components/SessionSync";
import { INDEXABLE, SITE_DESCRIPTION, SITE_URL, jsonLd } from "@/lib/site";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Spinlearn - Learn AI one concept at a time", template: "%s | Spinlearn" },
  description: SITE_DESCRIPTION,
  applicationName: "Spinlearn",
  authors: [{ name: "Sakshi" }],
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
  robots: { index: INDEXABLE, follow: INDEXABLE },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface-0">
        <SessionSync />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({
          "@context": "https://schema.org", "@type": "WebSite", name: "Spinlearn", url: SITE_URL,
          description: SITE_DESCRIPTION, inLanguage: "en", publisher: { "@type": "Person", name: "Sakshi" },
        }) }} />
        {children}
      </body>
    </html>
  );
}
