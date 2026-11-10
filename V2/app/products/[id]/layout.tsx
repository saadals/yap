import type { Metadata } from "next";

import { productIds } from "@/lib/static-params";

export const metadata: Metadata = {
  title: "Product",
  description: "Product context, learnings and the videos made for it.",
};

/** Pre-renders known ids for the static export (GitHub Pages). See lib/static-params.ts. */
export function generateStaticParams() {
  return productIds().map((id) => ({ id }));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
