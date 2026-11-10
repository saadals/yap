"use client";

import { Suspense } from "react";

import { ProductivityPage, ProductivitySkeleton } from "@/components/productivity/productivity-page";
import { AppShell } from "@/components/shell/app-shell";

export default function Productivity() {
  return (
    <AppShell>
      <Suspense fallback={<ProductivitySkeleton />}>
        <ProductivityPage />
      </Suspense>
    </AppShell>
  );
}
