"use client";

import { Suspense } from "react";

import { AuthSkeleton } from "@/components/auth/auth-skeleton";
import { SignInScreen } from "@/components/auth/sign-in";
import { PublicShell } from "@/components/shell/app-shell";

export default function SignInPage() {
  return (
    <PublicShell footer={false} bottomBar={false}>
      <Suspense fallback={<AuthSkeleton />}>
        <SignInScreen />
      </Suspense>
    </PublicShell>
  );
}
