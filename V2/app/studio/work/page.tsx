"use client";

import { Suspense } from "react";

import { FindWorkPage, FindWorkSkeleton } from "@/components/find-work/find-work-page";
import { AppShell } from "@/components/shell/app-shell";

/** Studio → Find work: open custom orders and UGC campaigns, ranked by fit. */
export default function FindWork() {
  return (
    <AppShell>
      <Suspense fallback={<FindWorkSkeleton />}>
        <FindWorkPage />
      </Suspense>
    </AppShell>
  );
}
