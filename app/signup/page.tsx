"use client";

import { Suspense } from "react";

import { AuthSkeleton } from "@/components/auth/auth-skeleton";
import { SignUpScreen } from "@/components/auth/sign-up";
import { PublicShell } from "@/components/shell/app-shell";

export default function SignUpPage() {
  return (
    <PublicShell footer={false} bottomBar={false}>
      <Suspense fallback={<AuthSkeleton />}>
        <SignUpScreen />
      </Suspense>
    </PublicShell>
  );
}
