"use client";

import { Suspense } from "react";

import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { paths } from "@/lib/paths";
import { isCampaign, requestById } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";
import type { ContentRequest } from "@/lib/types";

import { CampaignOwnerView } from "./campaign-view";
import { RequestOwnerView } from "./request-view";
import type { CampaignRequest } from "./shared";

/** Skeleton while the saved demo state loads (or the search params resolve). */
function OwnerSkeleton() {
  return (
    <Page>
      <div className="flex flex-col gap-3 pb-6" aria-busy="true" aria-label="Loading order">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-3/4 max-w-xl" />
        <Skeleton className="h-5 w-72" />
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="grid gap-2 md:grid-cols-2 lg:col-span-8">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
        <div className="flex flex-col gap-2 lg:col-span-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    </Page>
  );
}

/**
 * The owner's view of an order (rendered by app/orders/[id]/page.tsx inside <AppShell mode="order">
 * when the signed-in account placed it): a custom request's pitch board, or a UGC campaign's
 * review copies and slots. Reads the live record so it follows store updates.
 */
export function OrderOwnerView({ request }: { request: ContentRequest }) {
  const s = useDemo();
  const hydrated = useHydrated();
  // Prefer the live record: the page may hand us a snapshot from before hydration.
  const live = requestById(s, request.id) ?? request;

  // Wait for the saved state: pitch statuses and campaign slots differ from the seed once used.
  if (!hydrated) return <OwnerSkeleton />;

  if (isCampaign(live)) {
    if (!live.campaign) {
      return (
        <Page width="narrow">
          <Block tone="paper" pad="lg">
            <EmptyState
              title="We couldn't load this campaign"
              body="Its terms are missing from this demo session. Your other orders are all in Orders."
              action={
                <PillButton href={paths.orders()} variant="contrast">
                  Back to orders
                </PillButton>
              }
            />
          </Block>
        </Page>
      );
    }
    return <CampaignOwnerView key={live.id} request={live as CampaignRequest} />;
  }

  return (
    <Suspense fallback={<OwnerSkeleton />}>
      <RequestOwnerView key={live.id} request={live} />
    </Suspense>
  );
}
