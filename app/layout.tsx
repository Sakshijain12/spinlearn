import type { Metadata, Viewport } from "next";
import { SessionSync } from "@/components/SessionSync";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spinlearn - Daily AI Learning",
  description:
    "A daily AI-concept learning platform. Spin to find today's topic, then learn in 5 steps.",
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
        {children}
      </body>
    </html>
  );
}
