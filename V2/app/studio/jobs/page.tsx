"use client";

import { Suspense } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { JobsPage, JobsSkeleton } from "@/components/studio-jobs/jobs-page";

export default function StudioJobsRoute() {
  return (
    <AppShell>
      <Suspense fallback={<JobsSkeleton />}>
        <JobsPage />
      </Suspense>
    </AppShell>
  );
}
