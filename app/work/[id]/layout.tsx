import type { Metadata } from "next";

import { commissionIds } from "@/lib/static-params";

export const metadata: Metadata = {
  title: "Order",
  description: "One order from brief to payment: versions, comments, messages and money.",
};

/** Pre-renders known ids for the static export (GitHub Pages). See lib/static-params.ts. */
export function generateStaticParams() {
  return commissionIds().map((id) => ({ id }));
}

export default function CommissionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
