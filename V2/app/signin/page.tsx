"use client";

import { Suspense } from "react";

import { FocusFrame } from "@/components/auth/focus-frame";
import { SignInCard, SignInSkeleton } from "@/components/auth/sign-in-card";

/** One sign-in and sign-up page: a centred card (`?intent`, `?next`, `?new=1`). */
export default function SignInPage() {
  return (
    <FocusFrame centred>
      <Suspense fallback={<SignInSkeleton />}>
        <SignInCard />
      </Suspense>
    </FocusFrame>
  );
}
