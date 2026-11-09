"use client";

import { useSearchParams } from "next/navigation";

import type { SignInIntent } from "@/lib/paths";

import { WelcomeScene } from "./welcome-scene";

const toIntent = (value: string | null): SignInIntent | null =>
  value === "ask" || value === "make" ? value : null;

/** /signin and /signup: reads `?intent` and `?next`, so it must sit inside <Suspense>. */
export function WelcomeFromUrl() {
  const params = useSearchParams();
  return (
    <WelcomeScene initialPanel={{ intent: toIntent(params.get("intent")), next: params.get("next") }} />
  );
}
