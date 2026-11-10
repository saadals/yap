/**
 * Pure helpers for the owner's view of an order (custom requests and UGC campaigns). Safe in
 * render: no React, no store writes. Ported from V1's components/requests/shared.ts and
 * components/campaigns/shared.ts, trimmed to what the owner view needs.
 */

import { TZ_OFFSET, at } from "@/lib/clock";
import { compact, daysFromNow, money, plural } from "@/lib/format";
import { fit, type Fit } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import {
  CAMPAIGN_KEEP_LIVE_DAYS,
  CAMPAIGN_RELEASE_DAYS,
  campaignPlatformById,
  formatById,
  languageById,
  nicheById,
} from "@/lib/taxonomy";
import type {
  CampaignPlatformId,
  CampaignTerms,
  ContentRequest,
  Creator,
  FormatId,
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

export function sortPitches(list: RankedPitch[], sort: PitchSort): RankedPitch[] {
  return [...list].sort((a, b) => {
    if (sort === "price") return a.pitch.price - b.pitch.price || b.fit.score - a.fit.score;
    if (sort === "fastest") return a.pitch.deliveryDays - b.pitch.deliveryDays || b.fit.score - a.fit.score;
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
 * When the first version would land if hired today. Booked creators start when they're free, so
 * their clock starts at `availableFrom` (the store's hirePitch does the same).
 */
export function deliveryInfo(days: number, request: ContentRequest, creator?: Creator) {
  const waitDays =
    creator && !creator.available && creator.availableFrom ? Math.max(0, daysFromNow(creator.availableFrom)) : 0;
  const date = at(waitDays + days, "18:00");
  return {
    date,
    late: Date.parse(date) > Date.parse(request.dueDate),
    startsOn: waitDays ? creator?.availableFrom : undefined,
  };
}

/**
 * What matched, as short tags for one line: "English, App demo, Fintech". Gaps are left to the
 * pitch sheet (where `fit.gaps` is explained).
 */
export function fitTags(creator: Creator, request: ContentRequest, product?: Product): string[] {
  const tags: string[] = [];
  const langs = request.brief.languages.filter((l) => creator.languages.includes(l));
  tags.push(...langs.map((l) => languageById[l].name));
  if (creator.formats.includes(request.brief.format)) tags.push(formatById[request.brief.format].name);
  if (product && creator.niches.includes(product.niche)) tags.push(nicheById[product.niche].name);
  return tags;
}

export const responseLabel = (hours: number) =>
  hours < 1 ? "replies within an hour" : `replies in about ${Math.round(hours)}h`;

/** For hook packs the count is hooks; otherwise videos. */
export function deliverableLabel(format: FormatId, count: number): string {
  return format === "hook-pack" ? plural(count, "hook") : plural(count, "video");
}

/** Is a request's brief complete enough to post? (V1's rule.) */
export function briefComplete(request: ContentRequest): boolean {
  const b = request.brief;
  return Boolean(
    b.productId &&
      b.format &&
      b.platforms.length &&
      b.languages.length &&
      b.audience.trim().length >= 10 &&
      b.goal.trim().length >= 10 &&
      b.keyMessage.trim().length >= 5 &&
      request.title.trim().length >= 6 &&
      request.budget.max >= request.budget.min &&
      daysFromNow(request.dueDate) >= 1,
  );
}

/** The lowest budget a custom request can name (V1's wizard floor). */
export const BUDGET_FLOOR = 50;

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

export const perVideo = (price: number) => `${money(price)} a video`;

/** "paid partnership label" / "paid partnership tag" */
export const disclosureName = (platform: CampaignPlatformId) =>
  campaignPlatformById[platform].disclosure.split(" (")[0].toLowerCase();

/** The posting rule creators agree to. */
export const postingRule = (terms: Pick<CampaignTerms, "platform" | "brandHandle">) =>
  `Post it on their own ${campaignPlatformById[terms.platform].name}, tag ${terms.brandHandle}, turn on the ${disclosureName(terms.platform)}, and keep it up for ${CAMPAIGN_KEEP_LIVE_DAYS} days.`;

export const deadlineRule = (terms: Pick<CampaignTerms, "deadlineDays">) =>
  `Upload a review copy within ${plural(terms.deadlineDays, "day")} of taking a slot.`;

export const payRule = () =>
  `Each creator is paid ${CAMPAIGN_RELEASE_DAYS} days after we verify their post, if it's still up. Until then the money stays held.`;

/** A creator's verified followers on the campaign's platform: "14.2K on TikTok". */
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
