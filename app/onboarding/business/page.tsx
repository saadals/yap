"use client";

import { Suspense } from "react";

import { AuthSkeleton } from "@/components/auth/auth-skeleton";
import { BusinessOnboarding } from "@/components/auth/business-onboarding";
import { PublicShell } from "@/components/shell/app-shell";

export default function BusinessOnboardingPage() {
  return (
    <PublicShell footer={false} bottomBar={false}>
      <Suspense fallback={<AuthSkeleton variant="wizard" />}>
        <BusinessOnboarding />
      </Suspense>
    </PublicShell>
  );
}
