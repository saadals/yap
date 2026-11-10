/**
 * Pure helpers for the campaign UI (the order page and the job page). No React, no store writes.
 * The new-order form (components/new-order) posts campaigns.
 */

import { brandHandleFor, campaignBudget, platformList, type IneligibleReason } from "@/lib/campaigns";
import { compact, money, plural } from "@/lib/format";
import { CAMPAIGN_FEE_RATE, CAMPAIGN_KEEP_LIVE_DAYS, campaignPlatformById, tierById } from "@/lib/taxonomy";
import type { CampaignPlatformId, CampaignTerms, ContentRequest, Creator } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Explainer video                                                             */
/* -------------------------------------------------------------------------- */

export type Explainer = {
  name: string;
  durationSec: number;
  /** Where it came from: a simulated upload or one of the product's footage files. */
  source: "upload" | "asset";
  assetId?: string;
};

/* -------------------------------------------------------------------------- */
/* Copy                                                                        */
/* -------------------------------------------------------------------------- */

/** "paid partnership label" / "paid partnership tag" */
export const disclosureName = (platform: CampaignPlatformId) =>
  campaignPlatformById[platform].disclosure.split(" (")[0].toLowerCase();

/** The posting rule creators agree to, on the platform they post on (default: the campaign's first). */
export const postingRule = (
  terms: Pick<CampaignTerms, "platforms" | "brandHandles">,
  platform: CampaignPlatformId = terms.platforms[0],
) =>
  `Post it on your ${campaignPlatformById[platform].name}, tag ${brandHandleFor(terms, platform)}, turn on the ${disclosureName(platform)}, and keep it up for ${CAMPAIGN_KEEP_LIVE_DAYS} days.`;

/** "Upload within 5 days of picking, set by Daftar" */
export const deadlineLine = (terms: Pick<CampaignTerms, "deadlineDays">, brandName?: string) =>
  `Upload within ${plural(terms.deadlineDays, "day")} of picking${brandName ? `, set by ${brandName}` : ""}`;

/** "10K–20K verified real followers on TikTok" ("on TikTok or Instagram" for two platforms) */
export const requirementLine = (terms: Pick<CampaignTerms, "tierId" | "platforms">) =>
  `${tierById[terms.tierId].label} verified real followers on ${platformList(terms.platforms)}`;

export const perYapp = (price: number) => `${money(price)} per Yapp`;

/** A creator's net for one slot at this price ($140 → $112). */
export const slotNet = (price: number) => campaignBudget(1, price).perCreator;

/** The campaign fee as a percentage for copy. */
export const CAMPAIGN_FEE_PCT = Math.round(CAMPAIGN_FEE_RATE * 100);

/**
 * "Only 3 Yapps left · pick one now" or "7 of 10 slots open". Pass `urge: false` when the viewer
 * can't pick one (no "pick one now" nudge).
 */
export function seatsLine(open: number, total: number, urge = true): string {
  if (open <= 0) return `All ${total} slots taken`;
  if (open <= 3) return `Only ${open} ${open === 1 ? "Yapp" : "Yapps"} left${urge ? " · pick one now" : ""}`;
  return `${open} of ${total} slots open`;
}

/** A creator's verified followers on the campaign's platform: "14.2K on TikTok". */
export function followersOn(creator: Creator, platform: CampaignPlatformId) {
  const social = creator.socials?.find((a) => a.platform === platform);
  if (!social) return { text: `No ${campaignPlatformById[platform].name} connected`, verified: false };
  return {
    text: `${compact(social.followers)} on ${campaignPlatformById[platform].name}`,
    verified: social.verified,
  };
}

/** Why this account can't pick a slot, in plain words. */
export function ineligibleCopy(
  reason: IneligibleReason,
  request: ContentRequest,
  followers?: number,
  /** The platform the reason is about (from `eligibility`); default: all the campaign lists. */
  on?: CampaignPlatformId,
): { title: string; body?: string } {
  const terms = request.campaign;
  const platform = on ? campaignPlatformById[on].name : terms ? platformList(terms.platforms) : "the platform";
  const tier = terms ? tierById[terms.tierId].label : "";
  switch (reason) {
    case "own":
      return { title: "This is your own campaign", body: "You can't pick a slot on a campaign you placed." };
    case "closed":
      return { title: "This campaign is closed", body: "It isn't taking creators any more." };
    case "full":
      return { title: "All slots are taken", body: "If a slot reopens, it goes to the first eligible creator who picks it." };
    case "joined":
      return { title: "You already have a slot" };
    case "excluded":
      return { title: "You can't pick a slot on this campaign again" };
    case "no_profile":
      return { title: "Create a creator profile to take work", body: "It takes a minute. Then connect your account so we can check your followers." };
    case "no_account":
      return { title: `Connect your ${platform} account to check your followers`, body: "It's read-only. We only count real, verified followers." };
    case "unverified":
      return { title: "We're still verifying your followers", body: "This usually takes a few minutes. Check back soon." };
    case "below":
    case "above":
      return {
        title: `This campaign is for creators with ${tier} real followers on ${platform}.`,
        body: followers !== undefined ? `You have ${compact(followers)}.` : undefined,
      };
  }
}
