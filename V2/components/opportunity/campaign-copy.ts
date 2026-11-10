/**
 * Plain-words copy for UGC campaigns as a creator sees them (from V1's components/campaigns/shared.ts),
 * plus V2's one-line eligibility used by Find work and the campaign page. Pure, safe in render.
 */

import type { Eligibility, IneligibleReason } from "@/lib/campaigns";
import { compact, money, plural } from "@/lib/format";
import { CAMPAIGN_KEEP_LIVE_DAYS, campaignPlatformById, tierById } from "@/lib/taxonomy";
import type { CampaignPlatformId, CampaignTerms, ContentRequest } from "@/lib/types";

/** "paid partnership label" / "paid partnership tag" */
export const disclosureName = (platform: CampaignPlatformId) =>
  campaignPlatformById[platform].disclosure.split(" (")[0].toLowerCase();

/** The posting rule creators agree to. */
export const postingRule = (terms: Pick<CampaignTerms, "platform" | "brandHandle">) =>
  `Post it on your ${campaignPlatformById[terms.platform].name}, tag ${terms.brandHandle}, turn on the ${disclosureName(terms.platform)}, and keep it up for ${CAMPAIGN_KEEP_LIVE_DAYS} days.`;

/** "10K–20K verified followers on TikTok" */
export const requirementLine = (terms: Pick<CampaignTerms, "tierId" | "platform">) =>
  `${tierById[terms.tierId].label} verified followers on ${campaignPlatformById[terms.platform].name}`;

export const perVideo = (price: number) => `${money(price)} per video`;

/** "3 of 10 slots left" / "Only 1 slot left" / "All 10 slots taken" */
export function slotsLine(open: number, total: number): string {
  if (open <= 0) return `All ${total} slots taken`;
  if (open === 1) return "Only 1 slot left";
  return `${open} of ${total} slots left`;
}

export type EligibilityLine = {
  /** ok: can take a slot; fix: can't yet, but something on Yapp fixes it; no: can't. */
  state: "ok" | "fix" | "no";
  text: string;
};

/**
 * Eligibility in words, for a row or a header line:
 *   "You qualify: 18.4K verified followers on TikTok"
 *   "Needs 20K–50K verified followers on Instagram (you have 9.1K)"
 */
export function eligibilityLine(check: Eligibility, request: ContentRequest): EligibilityLine {
  const terms = request.campaign;
  if (!terms) return { state: "no", text: "Closed" };
  const platform = campaignPlatformById[terms.platform].name;
  const tier = tierById[terms.tierId].label;
  if (check.ok) return { state: "ok", text: `You qualify: ${compact(check.social.followers)} verified followers on ${platform}` };
  switch (check.reason) {
    case "no_profile":
      return { state: "fix", text: `For creators with ${tier} verified followers on ${platform}` };
    case "no_account":
      return { state: "fix", text: `Needs ${tier} verified followers on ${platform}: connect your ${platform}` };
    case "unverified":
      return { state: "fix", text: `We're still checking your ${platform} followers` };
    case "below":
    case "above":
      return {
        state: "no",
        text: `Needs ${tier} verified followers on ${platform}${check.social ? ` (you have ${compact(check.social.followers)})` : ""}`,
      };
    case "excluded":
      return { state: "no", text: "Not open to you on this campaign" };
    case "joined":
      return { state: "ok", text: "You have a slot" };
    case "full":
      return { state: "no", text: "Campaign full" };
    case "closed":
      return { state: "no", text: "Closed" };
    case "own":
    default:
      return { state: "no", text: "Your own campaign" };
  }
}

/** Why this account can't take a slot, in plain words (title and the fix). Never blames. */
export function ineligibleCopy(
  reason: IneligibleReason,
  request: ContentRequest,
  followers?: number,
): { title: string; body?: string } {
  const terms = request.campaign;
  const platform = terms ? campaignPlatformById[terms.platform].name : "the platform";
  const tier = terms ? tierById[terms.tierId].label : "";
  switch (reason) {
    case "own":
      return { title: "This is your own campaign", body: "You can't take a slot on a campaign you placed." };
    case "closed":
      return { title: "This campaign is closed", body: "It isn't taking creators any more." };
    case "full":
      return {
        title: "Campaign full",
        body: "Every slot is taken. If one reopens, it goes to the first creator who qualifies and takes it.",
      };
    case "joined":
      return { title: "You already have a slot" };
    case "excluded":
      return {
        title: "This campaign is closed to you",
        body: "You've worked on a slot here before, and each campaign gives a slot to a creator once. Other campaigns are open to you as usual.",
      };
    case "no_profile":
      return {
        title: "Set up your creator profile to take a slot",
        body: `It takes a minute. Then connect your ${platform} so we can check your followers.`,
      };
    case "no_account":
      return {
        title: `Connect your ${platform} to check your followers`,
        body: "It's read-only: we never post for you. We count real, verified followers.",
      };
    case "unverified":
      return { title: `We're still checking your ${platform} followers`, body: "This usually takes a few minutes." };
    case "below":
      return {
        title: "Your verified followers are below this tier",
        body: `This campaign is for ${tier} verified followers on ${platform}${followers !== undefined ? `, and you have ${compact(followers)}` : ""}. Campaigns for your tier show up in Find work.`,
      };
    case "above":
      return {
        title: "Your audience is above this tier",
        body: `This campaign is for ${tier} verified followers on ${platform}${followers !== undefined ? `, and you have ${compact(followers)}` : ""}. Campaigns for bigger accounts pay more.`,
      };
  }
}

/** "Upload your review copy within 5 days, by Mon, Nov 9" */
export const uploadLine = (days: number, byDate: string) =>
  `Upload your review copy within ${plural(days, "day")}, by ${byDate}`;
