/**
 * Marketing numbers and example picks. Everything the demo data can tell us is computed from the
 * store; the few platform-wide claims it can't derive live in MARKETING below, in one place.
 */

import { featuredVideo, portfolio, startingPrice } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { compact } from "@/lib/format";
import {
  CAMPAIGN_FEE_RATE,
  CAMPAIGN_KEEP_LIVE_DAYS,
  CAMPAIGN_MIN_VIDEOS,
  CAMPAIGN_OPEN_DAYS,
  CAMPAIGN_RELEASE_DAYS,
  CAMPAIGN_STEP,
  SERVICE_FEE_RATE,
  addons as addonList,
  followerTiers,
} from "@/lib/taxonomy";
import type { AddonId, Creator, Video } from "@/lib/types";

/** Platform-wide claims that the seed data can't derive. Keep every hard-coded figure here. */
export const MARKETING = {
  /** Share of deliveries approved on the first version, without a revision round. */
  firstTimeApprovalPct: 86,
  /** Typical bank / wallet transfer time once a creator withdraws. */
  payoutTime: "1–2 business days",
  /** Minimum withdrawal for creators. */
  minimumPayout: 20,
  /** How long a creator has to accept a direct offer before it expires. */
  offerExpiryDays: 3,
};

/**
 * UGC campaign facts for marketing copy, from the taxonomy constants. Only confirmed tiers are
 * quoted (the higher ones are placeholders until the PM confirms them).
 */
export function campaignFacts() {
  const confirmed = followerTiers.filter((tier) => !tier.placeholder);
  return {
    minVideos: CAMPAIGN_MIN_VIDEOS,
    step: CAMPAIGN_STEP,
    /** Service fee on campaigns: charged with the budget when posted, held and refunded with it. */
    feePct: Math.round(CAMPAIGN_FEE_RATE * 100),
    customFeePct: Math.round(SERVICE_FEE_RATE * 100),
    /** Creators are paid this many days after their post is verified. */
    releaseDays: CAMPAIGN_RELEASE_DAYS,
    /** Posts stay up this long from verification. */
    keepLiveDays: CAMPAIGN_KEEP_LIVE_DAYS,
    /** A campaign takes creators for this long unless the brand closes it. */
    openDays: CAMPAIGN_OPEN_DAYS,
    fromPrice: confirmed[0]?.pricePerVideo ?? followerTiers[0].pricePerVideo,
    /** Lowest verified follower count a campaign accepts ("10K"). */
    floor: compact(followerTiers[0].min),
    tiers: confirmed,
  };
}

/** Fallback add-on prices when no creator in the store offers an add-on. */
const addonFallback: Record<AddonId, number> = {
  "extra-revision": 40,
  "raw-footage": 50,
  subtitles: 40,
  "ad-rights-90": 90,
  "ad-rights-365": 220,
  rush: 80,
  "extra-hooks": 60,
  "post-to-account": 250,
};

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function platformStats(s: DemoState) {
  const creators = s.creators;
  const completed = creators.reduce((sum, c) => sum + c.completed, 0);
  const reviewCount = creators.reduce((sum, c) => sum + c.reviewCount, 0);
  const avgRating = reviewCount
    ? creators.reduce((sum, c) => sum + c.rating * c.reviewCount, 0) / reviewCount
    : 0;
  const firstDeliveryDays = median(
    creators.map((c) => Math.min(...c.packages.map((p) => p.deliveryDays))),
  );
  const languages = new Set(creators.flatMap((c) => c.languages)).size;
  return {
    creators: creators.length,
    completed,
    reviewCount,
    avgRating,
    firstDeliveryDays,
    languages,
    onTimePct: median(creators.map((c) => c.onTimeRate)),
    repeatPct: median(creators.map((c) => c.repeatClientRate)),
    startingPrice: median(creators.map((c) => startingPrice(c))),
    firstTimeApprovalPct: MARKETING.firstTimeApprovalPct,
  };
}

/** Top rated and available first, then rating and volume. */
export function featuredCreators(s: DemoState, count = 8): Creator[] {
  return [...s.creators]
    .sort(
      (a, b) =>
        Number(b.available) - Number(a.available) ||
        Number(b.topRated) - Number(a.topRated) ||
        b.rating - a.rating ||
        b.reviewCount - a.reviewCount,
    )
    .slice(0, count);
}

/** Median price each add-on sells for on the marketplace. */
export function typicalAddonPrices(s: DemoState): Record<AddonId, number> {
  const result = { ...addonFallback };
  for (const addon of addonList) {
    const prices = s.creators.flatMap((c) =>
      c.addons.filter((a) => a.id === addon.id).map((a) => a.price),
    );
    if (prices.length) result[addon.id] = median(prices);
  }
  return result;
}

/** Lowest budget a custom request can post (the request flow's floor, $50). */
export const BUDGET_FLOOR = 50;

/**
 * Vertical sample videos for the landing page: one per creator (their featured video when it's
 * vertical, else their first vertical one), best-known creators first.
 */
export function sampleVideos(s: DemoState, count = 10): { video: Video; creator: Creator }[] {
  const picks: { video: Video; creator: Creator }[] = [];
  for (const creator of featuredCreators(s, s.creators.length)) {
    const videos = portfolio(s, creator).filter((video) => video.aspect === "9:16");
    const featured = featuredVideo(s, creator);
    const video = featured && featured.aspect === "9:16" ? featured : videos[0];
    if (video) picks.push({ video, creator });
    if (picks.length >= count) break;
  }
  return picks;
}

/** Open briefs and campaigns anyone can see, newest first (not the viewer's own). */
export function openOrders(s: DemoState, excludeBusinessId?: string, count = 3) {
  return s.requests
    .filter((r) => r.status === "open" && r.visibility === "public" && r.businessId !== excludeBusinessId)
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))
    .slice(0, count);
}
