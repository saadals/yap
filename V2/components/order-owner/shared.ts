/**
 * Pure helpers for the owner's view of an order (custom orders and UGC campaigns). Safe in
 * render: no React, no store writes. Ported from V1's components/requests/shared.ts and
 * components/campaigns/shared.ts, trimmed to what the owner view needs.
 */

import { TZ_OFFSET, at } from "@/lib/clock";
import { compact, daysFromNow, money, plural } from "@/lib/format";
import { brandHandleFor, deadlineDaysOf, fit, isAdCopy, platformList, type Fit } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import {
  CAMPAIGN_KEEP_LIVE_DAYS,
  CAMPAIGN_RELEASE_DAYS,
  campaignPlatformById,
  formatById,
  languageById,
  nicheById,
  platformById,
  usageById,
} from "@/lib/taxonomy";
import type {
  AddonId,
  CampaignPlatformId,
  CampaignTerms,
  ContentRequest,
  Creator,
  FollowerTierId,
  Pitch,
  Product,
} from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Pitches                                                                     */
/* -------------------------------------------------------------------------- */

export type PitchSort = "fit" | "price" | "fastest";

export const sortLabels: Record<PitchSort, string> = {
  fit: "Best fit",
  price: "Lowest price",
  fastest: "Fastest",
};

export type RankedPitch = { pitch: Pitch; creator: Creator; fit: Fit };

export function rankPitches(s: DemoState, request: ContentRequest, pitches: Pitch[]): RankedPitch[] {
  return pitches
    .map((pitch) => {
      const creator = s.creators.find((c) => c.id === pitch.creatorId);
      return creator ? { pitch, creator, fit: fit(s, creator, request) } : null;
    })
    .filter((x): x is RankedPitch => x !== null);
}

export function sortPitches(list: RankedPitch[], sort: PitchSort, request: ContentRequest): RankedPitch[] {
  const ready = (item: RankedPitch) => Date.parse(deliveryInfo(item.pitch.deliveryDays, request, item.creator).date);
  return [...list].sort((a, b) => {
    if (sort === "price") return a.pitch.price - b.pitch.price || b.fit.score - a.fit.score;
    if (sort === "fastest") return ready(a) - ready(b) || b.fit.score - a.fit.score;
    return b.fit.score - a.fit.score || Date.parse(b.pitch.sentAt) - Date.parse(a.pitch.sentAt);
  });
}

/** Still waiting for a decision from the business (not shortlisted, declined or hired). */
export const isUndecided = (p: Pitch) => p.status === "sent" || p.status === "viewed";

/** Not declined, hired or withdrawn: the business can still hire it. */
export const isInRunning = (p: Pitch) => p.status === "sent" || p.status === "viewed" || p.status === "shortlisted";

/** Price against the request budget, told honestly. */
export function budgetNote(price: number, budget: { min: number; max: number }) {
  if (price > budget.max) return { text: `${money(price - budget.max)} over your max`, over: true };
  if (price < budget.min) return { text: "Under your budget", over: false };
  return { text: "Within your budget", over: false };
}

/**
 * When the first version would land if hired today. The brand's delivery deadline wins on orders
 * that set one (every pitch then has the same days); older orders use the pitch's own days. Booked
 * creators start when they're free, so their clock starts at `availableFrom` (the store's hirePitch
 * does the same).
 */
export function deliveryInfo(days: number, request: ContentRequest, creator?: Creator) {
  const waitDays =
    creator && !creator.available && creator.availableFrom ? Math.max(0, daysFromNow(creator.availableFrom)) : 0;
  const date = at(waitDays + (deadlineDaysOf(request) ?? days), "18:00");
  return {
    date,
    late: Date.parse(date) > Date.parse(request.dueDate),
    startsOn: waitDays ? creator?.availableFrom : undefined,
  };
}

/**
 * What matched, as short tags for one line: "English, App demo, Fintech". Gaps are left to the
 * pitch sheet (where `fit.gaps` is explained). Ad copy has no format to match.
 */
export function fitTags(creator: Creator, request: ContentRequest, product?: Product): string[] {
  const tags: string[] = [];
  const langs = request.brief.languages.filter((l) => creator.languages.includes(l));
  tags.push(...langs.map((l) => languageById[l].name));
  if (!isAdCopy(request) && creator.formats.includes(request.brief.format)) tags.push(formatById[request.brief.format].name);
  if (product && creator.niches.includes(product.niche)) tags.push(nicheById[product.niche].name);
  return tags;
}

export const responseLabel = (hours: number) =>
  hours < 1 ? "replies within an hour" : `replies in about ${Math.round(hours)}h`;

/**
 * What the order asks for, in a few words: "2 videos", "5 hooks", or for ad copy "3 pieces of
 * copy" (the pieces themselves are listed in the brief).
 */
export function deliverableLabel(request: Pick<ContentRequest, "brief">): string {
  const b = request.brief;
  if (isAdCopy(request)) return plural(Math.max(1, b.copy?.pieces.length ?? 1), "piece") + " of copy";
  return b.format === "hook-pack" ? plural(b.videoCount, "hook") : plural(b.videoCount, "video");
}

/**
 * The order's facts in one line, for the rail: "2 videos · up to 45s · English · TikTok, Reels".
 * Ad copy has no video facts: "3 pieces of copy · English · runs on Meta ads, Instagram".
 */
export function briefFacts(request: Pick<ContentRequest, "brief">, length: (sec: number) => string): string {
  const b = request.brief;
  const langs = b.languages.map((id) => languageById[id].name).join(", ");
  if (isAdCopy(request)) {
    const placements = b.copy?.placements.map((id) => platformById[id].name).join(", ");
    return [deliverableLabel(request), langs, placements ? `runs on ${placements}` : null].filter(Boolean).join(" · ");
  }
  return [
    deliverableLabel(request),
    `up to ${length(b.durationSec)}`,
    langs,
    b.platforms.map((id) => platformById[id].short).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The extras a creator offers that fit this order. Ad copy has nothing to subtitle, rush or post,
 * so only an extra round of changes and alternate hooks (lines) apply there.
 */
const AD_COPY_ADDONS: AddonId[] = ["extra-revision", "extra-hooks"];
export const addonsFor = (request: Pick<ContentRequest, "brief">, creator: Creator) =>
  isAdCopy(request) ? creator.addons.filter((a) => AD_COPY_ADDONS.includes(a.id)) : creator.addons;

/** "Paid ads · 12 months" */
export const usageName = (request: Pick<ContentRequest, "brief">) => usageById[request.brief.usage].name;

/**
 * The order's delivery deadline, said once in the header: "Delivery 5 days after hire" (set by the
 * brand), or "Due Mon, Nov 16" on older orders that carry only a date.
 */
export function deadlineLabel(request: ContentRequest, date: (iso: string) => string): string {
  const days = deadlineDaysOf(request);
  return days ? `Delivery ${plural(days, "day")} after hire` : `Due ${date(request.dueDate)}`;
}

/** yyyy-mm-dd (display time) for a day offset, for <input type="date">. */
export function isoDay(dayOffset: number): string {
  return new Date(Date.parse(at(dayOffset, "12:00")) + TZ_OFFSET).toISOString().slice(0, 10);
}

/** Days from NOW for a yyyy-mm-dd value (display-time calendar). */
export function daysForIsoDay(value: string): number {
  const ms = Date.parse(`${value}T12:00:00.000Z`) - TZ_OFFSET;
  if (Number.isNaN(ms)) return NaN;
  return daysFromNow(new Date(ms).toISOString());
}

/* -------------------------------------------------------------------------- */
/* Campaigns                                                                   */
/* -------------------------------------------------------------------------- */

export type CampaignRequest = ContentRequest & { campaign: CampaignTerms };

export const perYapp = (price: number) => `${money(price)} per Yapp`;

/** "paid partnership label" / "paid partnership tag" */
export const disclosureName = (platform: CampaignPlatformId) =>
  campaignPlatformById[platform].disclosure.split(" (")[0].toLowerCase();

/**
 * The posting rule creators agree to. One platform: the handle and the label by name. Several:
 * each creator posts on the one they chose and tags the brand's account there.
 */
export function postingRule(terms: Pick<CampaignTerms, "platforms" | "brandHandles">): string {
  if (terms.platforms.length <= 1) {
    const platform = terms.platforms[0] ?? "tiktok";
    return `Post it on their own ${campaignPlatformById[platform].name}, tag ${brandHandleFor(terms, platform)}, turn on the ${disclosureName(platform)}, and keep it up for ${CAMPAIGN_KEEP_LIVE_DAYS} days.`;
  }
  return `Post it on the one they chose (${platformList(terms.platforms)}), tag your account there, turn on the paid-partnership label, and keep it up for ${CAMPAIGN_KEEP_LIVE_DAYS} days.`;
}

export const deadlineRule = (terms: Pick<CampaignTerms, "deadlineDays">) =>
  `Upload a review copy within ${plural(terms.deadlineDays, "day")} of picking a slot.`;

/**
 * What raising the price holds now: the difference for every unpicked slot. Taken slots keep the
 * price they were picked at (the store's `raiseCampaignPrice` charges the same).
 */
export const raiseTopUp = (openSlots: number, from: number, to: number) => Math.max(0, to - from) * openSlots;

/**
 * Creators who could pick at a tier on the campaign's platforms (verified real followers inside the
 * band on at least one of them), never counting the brand's own creator profile.
 */
export function qualifyingCreators(
  s: DemoState,
  terms: Pick<CampaignTerms, "platforms" | "excludedCreatorIds">,
  tier: { id: FollowerTierId; min: number; max: number },
  selfCreatorId?: string,
): number {
  return s.creators.filter(
    (creator) =>
      creator.id !== selfCreatorId &&
      !terms.excludedCreatorIds.includes(creator.id) &&
      creator.socials?.some(
        (a) => a.verified && terms.platforms.includes(a.platform) && a.followers >= tier.min && a.followers < tier.max,
      ),
  ).length;
}

export const payRule = () =>
  `Each creator is paid ${CAMPAIGN_RELEASE_DAYS} days after we verify their post, if it's still up. Until then the money stays held.`;

/** A creator's verified followers on the platform they post on: "14.2K on TikTok". */
export function followersOn(creator: Creator, platform: CampaignPlatformId) {
  const social = creator.socials?.find((a) => a.platform === platform);
  if (!social) return { text: `No ${campaignPlatformById[platform].name} connected`, verified: false };
  return { text: `${compact(social.followers)} on ${campaignPlatformById[platform].name}`, verified: social.verified };
}

/** "@creator" for a post URL, or the URL's host when it doesn't carry a handle. */
export function postLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.host.replace(/^www\./, "") + parsed.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}
