import type { Metadata } from "next";

import { requestIds } from "@/lib/static-params";

export const metadata: Metadata = {
  title: "Order",
  description: "One order: the owner manages pitches or campaign slots; creators pitch or take a slot.",
};

/** Pre-renders known ids for the static export (GitHub Pages). See lib/static-params.ts. */
export function generateStaticParams() {
  return requestIds().map((id) => ({ id }));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
