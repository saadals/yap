import { Suspense } from "react";

import { WelcomeFromUrl } from "@/components/landing/welcome-from-url";

/** The welcome scene with the sign-in panel already open. */
export default function SignInPage() {
  return (
    <Suspense fallback={<div className="y-welcome" />}>
      <WelcomeFromUrl />
    </Suspense>
  );
}
