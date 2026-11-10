import type { Metadata } from "next";

import { creatorHandles } from "@/lib/static-params";

export const metadata: Metadata = {
  title: "Creator",
  description: "A creator's videos, packages and reviews.",
};

/** Pre-renders known ids for the static export (GitHub Pages). See lib/static-params.ts. */
export function generateStaticParams() {
  return creatorHandles().map((handle) => ({ handle }));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
