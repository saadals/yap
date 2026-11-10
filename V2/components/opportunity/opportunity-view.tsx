"use client";

import type { CampaignTerms, ContentRequest } from "@/lib/types";

import { CampaignOpportunity } from "./campaign-opportunity";
import { RequestOpportunity } from "./request-opportunity";

/**
 * Someone else's order, as a creator sees it (shown by app/orders/[id] inside
 * `<AppShell mode="studio">` to anyone who doesn't own it): a custom request to pitch on, or a UGC
 * campaign to take a slot on.
 */
export function OpportunityView({ request }: { request: ContentRequest }) {
  if (request.kind === "campaign" && request.campaign) {
    return <CampaignOpportunity request={request as ContentRequest & { campaign: CampaignTerms }} />;
  }
  return <RequestOpportunity request={request} />;
}
