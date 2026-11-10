/**
 * Plain-words copy for UGC campaigns as a creator sees them (from V1's components/campaigns/shared.ts),
 * plus V2's one-line eligibility used by Find work and the campaign page. A campaign may list
 * several platforms; each creator posts on one, chosen when they pick. Pure, safe in render.
 */

import { brandHandleFor, platformList, type Eligibility, type IneligibleReason, type PlatformEligibility } from "@/lib/campaigns";
import { compact, money, moneyExact, plural, creatorNet } from "@/lib/format";
import { CAMPAIGN_KEEP_LIVE_DAYS, campaignPlatformById, tierById } from "@/lib/taxonomy";
import type { CampaignPlatformId, CampaignTerms, ContentRequest } from "@/lib/types";

/** "paid partnership label" / "paid partnership tag" */
export const disclosureName = (platform: CampaignPlatformId) =>
  campaignPlatformById[platform].disclosure.split(" (")[0].toLowerCase();

/** The posting rule creators agree to, on the platform they post on (default: the campaign's first). */
export const postingRule = (
  terms: Pick<CampaignTerms, "platforms" | "brandHandles">,
  platform: CampaignPlatformId = terms.platforms[0],
) =>
  `Post it on your ${campaignPlatformById[platform].name}, tag ${brandHandleFor(terms, platform)}, turn on the ${disclosureName(platform)}, and keep it up for ${CAMPAIGN_KEEP_LIVE_DAYS} days.`;

/** "10K–20K verified followers on TikTok" ("on TikTok or Instagram" for two platforms) */
export const requirementLine = (terms: Pick<CampaignTerms, "tierId" | "platforms">) =>
  `${tierById[terms.tierId].label} verified followers on ${platformList(terms.platforms)}`;

/** "$120 a Yapp" */
export const perYapp = (price: number) => `${money(price)} a Yapp`;

/** "you earn $96" for one Yapp at this listed price. */
export const yappNet = (price: number) => `you earn ${moneyExact(creatorNet(price))}`;

/** "3 of 10 left" / "Only 1 left" / "All 10 slots taken" */
export function slotsLine(open: number, total: number): string {
  if (open <= 0) return `All ${total} slots taken`;
  if (open === 1) return "Only 1 left";
  return `${open} of ${total} left`;
}

/** "Pick now · 3 of 10 left" */
export const pickLabel = (open: number, total: number) => `Pick now · ${slotsLine(open, total)}`;

export type EligibilityLine = {
  /** ok: can pick; fix: can't yet, but something on Yapp fixes it; no: can't. */
  state: "ok" | "fix" | "no";
  text: string;
};

/**
 * Eligibility in words, across the campaign's platforms, for a row or a header line:
 *   "You qualify on TikTok" / "You qualify on TikTok and Instagram"
 *   "Needs 20K–50K verified followers on Instagram (you have 9.1K)"
 */
export function eligibilityLine(check: Eligibility, request: ContentRequest): EligibilityLine {
  const terms = request.campaign;
  if (!terms) return { state: "no", text: "Closed" };
  const tier = tierById[terms.tierId].label;
  const about = check.platform ? campaignPlatformById[check.platform].name : platformList(terms.platforms);
  if (check.ok) return { state: "ok", text: `You qualify on ${platformList(check.platforms, "and")}` };
  switch (check.reason) {
    case "no_profile":
      return { state: "fix", text: `For ${tier} verified followers on ${platformList(terms.platforms)}` };
    case "no_account":
      return { state: "fix", text: `Needs ${tier} verified followers on ${platformList(terms.platforms)}: connect your account` };
    case "unverified":
      return { state: "fix", text: `We're still checking your ${about} followers` };
    case "below":
    case "above":
      return {
        state: "no",
        text: `Needs ${tier} verified followers on ${about}${check.social ? ` (you have ${compact(check.social.followers)})` : ""}`,
      };
    case "excluded":
      return { state: "no", text: "Not open to you on this campaign" };
    case "joined":
      return { state: "ok", text: "You picked a Yapp" };
    case "full":
      return { state: "no", text: "All slots taken" };
    case "closed":
      return { state: "no", text: "Closed" };
    case "own":
    default:
      return { state: "no", text: "Your own campaign" };
  }
}

/** One platform's check, in words: "18.4K verified followers · you qualify". */
export function platformCheckLine(check: PlatformEligibility, terms: Pick<CampaignTerms, "tierId">): string {
  const tier = tierById[terms.tierId].label;
  if (check.ok) return `${compact(check.social.followers)} verified followers · you qualify`;
  switch (check.reason) {
    case "no_account":
      return "Not connected yet";
    case "unverified":
      return "We're still checking your followers";
    case "below":
      return `${compact(check.social?.followers ?? 0)} verified followers, below ${tier}`;
    case "above":
      return `${compact(check.social?.followers ?? 0)} verified followers, above ${tier}`;
  }
}

/** Why this account can't pick, in plain words (title and the fix). Never blames. */
export function ineligibleCopy(
  reason: IneligibleReason,
  request: ContentRequest,
  followers?: number,
  /** The platform the reason is about (from `eligibility`); default: every platform the campaign lists. */
  on?: CampaignPlatformId,
): { title: string; body?: string } {
  const terms = request.campaign;
  const platform = on ? campaignPlatformById[on].name : terms ? platformList(terms.platforms) : "the platform";
  const tier = terms ? tierById[terms.tierId].label : "";
  switch (reason) {
    case "own":
      return { title: "This is your own campaign", body: "You can't pick a Yapp on a campaign you placed." };
    case "closed":
      return { title: "This campaign is closed", body: "It isn't taking creators any more." };
    case "full":
      return {
        title: "All slots are taken",
        body: "If one reopens, it goes to the first creator who qualifies and picks it.",
      };
    case "joined":
      return { title: "You already picked a Yapp here" };
    case "excluded":
      return {
        title: "This campaign is closed to you",
        body: "You've worked on a slot here before, and each campaign gives a slot to a creator once. Other campaigns are open to you as usual.",
      };
    case "no_profile":
      return {
        title: "Set up your creator profile to pick",
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
        body: `This campaign is for ${tier} verified followers on ${platform}${followers !== undefined ? `, and you have ${compact(followers)}` : ""}. Campaigns for bigger accounts show up in Find work.`,
      };
  }
}

/** "Upload your review copy within 5 days, by Mon, Nov 9" */
export const uploadLine = (days: number, byDate: string) =>
  `Upload your review copy within ${plural(days, "day")}, by ${byDate}`;
