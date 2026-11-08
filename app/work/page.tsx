"use client";

import { Suspense } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { WorkPage, WorkSkeleton } from "@/components/work/work-page";

export default function Work() {
  return (
    <AppShell>
      <Suspense fallback={<WorkSkeleton />}>
        <WorkPage />
      </Suspense>
    </AppShell>
  );
}
