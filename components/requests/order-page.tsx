"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { CampaignOrderView } from "@/components/campaigns";
import { AppShell } from "@/components/shell/app-shell";
import { JobPage } from "@/components/work/job-page";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { paths } from "@/lib/paths";
import { isCampaign, requestById, sideOf } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { OrderSkeleton, RequestView, type RequestTab } from "./request-detail";

const isRequestTab = (value: string | null): value is RequestTab =>
  value === "pitches" || value === "brief" || value === "invited";

/**
 * /orders/[id]: one URL per order, whoever is looking (the app's addresses stay; round 3 answers,
 * item 34).
 * - The owner (the brand) gets its existing screens (item 33): a campaign's slots, review copies,
 *   tier and close; a custom order's pitches, compare and hire.
 * - Everyone else gets the job page (Work spec 6.6): the brief, how it goes, the price with their
 *   net, and Pick now or Pitch now.
 */
export function OrderPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <Page>
            <OrderSkeleton />
          </Page>
        }
      >
        <OrderRouter />
      </Suspense>
    </AppShell>
  );
}

function OrderRouter() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const hydrated = useHydrated();
  const s = useDemo();
  // Wait for the saved state: the order may have been created in this browser, and who's
  // signed in decides which view this is.
  if (!hydrated) {
    return (
      <Page>
        <OrderSkeleton />
      </Page>
    );
  }
  const request = requestById(s, params.id);
  if (!request) {
    return (
      <Page width="narrow">
        <Block tone="paper" pad="lg">
          <EmptyState
            title="We couldn't find that order"
            body="It may have been deleted, or the link is out of date. Every open order is in Find work."
            action={
              <PillButton href={paths.findWork()} variant="contrast">
                Find work
              </PillButton>
            }
          />
        </Block>
      </Page>
    );
  }
  const owner = sideOf(s, { businessId: request.businessId }) === "business";
  if (isCampaign(request) && owner) {
    return (
      <Page>
        <CampaignOrderView request={request} />
      </Page>
    );
  }
  if (owner) {
    const tab = search.get("tab");
    return (
      <RequestView
        key={request.id}
        request={request}
        initialTab={isRequestTab(tab) ? tab : undefined}
        openPitchId={search.get("pitch") ?? undefined}
      />
    );
  }
  return <JobPage key={`${request.id}-${s.activeAccountId}`} request={request} />;
}
