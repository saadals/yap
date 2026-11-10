"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { requestById } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { CampaignFlow } from "./campaign-flow";
import { Chooser } from "./chooser";
import { FlowSkeleton } from "./flow-frame";
import { PitchesFlow } from "./pitches-flow";

/**
 * /orders/new. Without `?type` it asks how you want to work; `?type=custom` (or `?draft=`) is a
 * custom order (video or ad copy), `?type=campaign` the UGC campaign. `?again=` an earlier request opens the same kind
 * of flow; `?again=` a commission opens the chooser with that work carried through.
 * `?product=` and `?creator=` carry through everywhere.
 */
export function NewOrderPage() {
  return (
    <AppShell focus>
      <Suspense fallback={<FlowSkeleton label="Loading" />}>
        <Router />
      </Suspense>
    </AppShell>
  );
}

function Router() {
  const params = useSearchParams();
  const s = useDemo();
  const hydrated = useHydrated();
  const key = params.toString();
  const copy = new URLSearchParams(key);
  const type = params.get("type");
  if (params.get("draft") || type === "custom") return <PitchesFlow key={key} params={copy} />;
  if (type === "campaign") return <CampaignFlow key={key} params={copy} />;
  const again = params.get("again");
  if (again) {
    // Ids made in this browser exist only once the saved store is loaded.
    if (!hydrated) return <FlowSkeleton label="Loading" />;
    const previous = requestById(s, again);
    if (previous) return previous.kind === "campaign" ? <CampaignFlow key={key} params={copy} /> : <PitchesFlow key={key} params={copy} />;
  }
  return <Chooser key={key} params={copy} />;
}
