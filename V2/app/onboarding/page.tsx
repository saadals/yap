"use client";

import { Suspense } from "react";

import { FocusFrame } from "@/components/auth/focus-frame";
import { Onboarding } from "@/components/auth/onboarding";
import { Skeleton } from "@/components/ui/skeleton";
import { paths } from "@/lib/paths";

function OnboardingSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-1.5 w-full" />
      <Skeleton className="mt-4 h-9 w-3/4" />
      <Skeleton className="h-24 w-full !rounded-(--y-r-block)" />
      <Skeleton className="h-24 w-full !rounded-(--y-r-block)" />
    </div>
  );
}

/** One onboarding (order / make / both), as a focused flow. */
export default function OnboardingPage() {
  return (
    <FocusFrame exit={{ href: paths.landing, label: "Exit setup" }} footer={false}>
      <Suspense fallback={<OnboardingSkeleton />}>
        <Onboarding />
      </Suspense>
    </FocusFrame>
  );
}
