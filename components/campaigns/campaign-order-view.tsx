"use client";

import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { PillButton } from "@/components/ui/pill-button";
import { paths } from "@/lib/paths";
import { requestById, sideOf } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import type { ContentRequest } from "@/lib/types";

import type { CampaignRequest } from "./owner-sheets";
import { OwnerView } from "./owner-view";
import { TakeView } from "./take-view";

/**
 * A campaign's order page (the body of /orders/[id], inside AppShell + Page). The owner manages it:
 * progress, slots, money, tier and close. Everyone else reads it and takes a slot.
 */
export function CampaignOrderView({ request }: { request: ContentRequest }) {
  const s = useDemo();
  // Prefer the live record so the page follows store updates even if the prop is stale.
  const live = requestById(s, request.id) ?? request;
  if (!live.campaign) {
    return (
      <Block tone="paper" pad="lg" className="mt-2">
        <EmptyState
          title="We couldn't load this campaign"
          body="Its details are missing. Other campaigns are waiting in Explore."
          shape="dome"
          tint="violet"
          action={
            <PillButton href={paths.explore("orders")} variant="contrast">
              Browse orders
            </PillButton>
          }
        />
      </Block>
    );
  }
  const campaign = live as CampaignRequest;
  return sideOf(s, { businessId: live.businessId }) === "business" ? (
    <OwnerView request={campaign} />
  ) : (
    <TakeView request={campaign} />
  );
}
