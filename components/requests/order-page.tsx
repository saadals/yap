"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { CampaignOrderView } from "@/components/campaigns";
import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { paths } from "@/lib/paths";
import { isCampaign, requestById, sideOf } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { OpportunityView } from "./opportunity-view";
import { OrderSkeleton, RequestView, type RequestTab } from "./request-detail";

const isRequestTab = (value: string | null): value is RequestTab =>
  value === "pitches" || value === "brief" || value === "invited";

/**
 * /orders/[id]: one URL per order, whoever is looking.
 * - UGC campaign → the campaign page (owner manages slots; others take one).
 * - Custom request, owner → pitches, compare and hire.
 * - Custom request, anyone else → the brief and their pitch.
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
            body="It may have been deleted, or the link is out of date. Open orders are all in Explore."
            shape="dome"
            tint="violet"
            action={
              <PillButton href={paths.explore("orders")} variant="contrast">
                Explore orders
              </PillButton>
            }
          />
        </Block>
      </Page>
    );
  }
  if (isCampaign(request)) {
    return (
      <Page>
        <CampaignOrderView request={request} />
      </Page>
    );
  }
  if (sideOf(s, { businessId: request.businessId }) === "business") {
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
  return <OpportunityView key={`${request.id}-${s.activeAccountId}`} request={request} />;
}
