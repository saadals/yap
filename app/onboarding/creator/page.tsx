"use client";

import { Suspense } from "react";

import { AuthSkeleton } from "@/components/auth/auth-skeleton";
import { CreatorOnboarding } from "@/components/auth/creator-onboarding";
import { PublicShell } from "@/components/shell/app-shell";

export default function CreatorOnboardingPage() {
  return (
    <PublicShell footer={false} bottomBar={false}>
      <Suspense fallback={<AuthSkeleton variant="wizard" />}>
        <CreatorOnboarding />
      </Suspense>
    </PublicShell>
  );
}
