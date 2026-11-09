import { Suspense } from "react";

import { WelcomeFromUrl } from "@/components/landing/welcome-from-url";

/** Sign-up and sign-in are one flow: the same scene and panel as /signin. */
export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="y-welcome" />}>
      <WelcomeFromUrl />
    </Suspense>
  );
}
