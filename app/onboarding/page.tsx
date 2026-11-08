"use client";

import { Suspense } from "react";

import { AuthSkeleton } from "@/components/auth/auth-skeleton";
import { Onboarding } from "@/components/auth/onboarding";
import { PublicShell } from "@/components/shell/app-shell";

export default function OnboardingPage() {
  return (
    <PublicShell footer={false} bottomBar={false}>
      <Suspense fallback={<AuthSkeleton variant="wizard" />}>
        <Onboarding />
      </Suspense>
    </PublicShell>
  );
}
