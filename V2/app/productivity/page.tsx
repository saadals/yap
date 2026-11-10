"use client";

import { Suspense } from "react";

import { ProductivityPage, ProductivitySkeleton } from "@/components/productivity/productivity-page";
import { AppShell } from "@/components/shell/app-shell";

/**
 * Productivity: one page for both sides. No explicit mode: it keeps the tab's mode (Ordering shows
 * brand figures, Studio creator figures), and `?as=` moves the tab to that side's mode.
 */
export default function Productivity() {
  return (
    <AppShell>
      <Suspense fallback={<ProductivitySkeleton />}>
        <ProductivityPage />
      </Suspense>
    </AppShell>
  );
}
