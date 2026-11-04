/**
 * Marketing numbers and example picks. Everything the demo data can tell us is computed from the
 * store; the few platform-wide claims it can't derive live in MARKETING below, in one place.
 */

import { creatorById, startingPrice } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { addons as addonList, isArabic } from "@/lib/taxonomy";
import type { AddonId, Creator, FormatId, LanguageId, Review, Video } from "@/lib/types";

/** Platform-wide claims that the seed data can't derive. Keep every hard-coded figure here. */
export const MARKETING = {
  /** Share of deliveries approved on the first version, without a revision round. */
  firstTimeApprovalPct: 86,
  /** Typical bank / wallet transfer time once a creator withdraws. */
  payoutTime: "1–3 business days",
  /** Minimum withdrawal for creators. */
  minimumPayout: 20,
  /** How long a creator has to accept a direct offer before it expires. */
  offerExpiryDays: 3,
};

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
  const dialects = new Set(creators.flatMap((c) => c.languages).filter(isArabic)).size;
  return {
    creators: creators.length,
    completed,
    reviewCount,
    avgRating,
    firstDeliveryDays,
    dialects,
    onTimePct: median(creators.map((c) => c.onTimeRate)),
    repeatPct: median(creators.map((c) => c.repeatClientRate)),
    startingPrice: median(creators.map((c) => startingPrice(c))),
    firstTimeApprovalPct: MARKETING.firstTimeApprovalPct,
  };
}

/** Highest-performing pieces first, Arabic before English (our launch audience). */
function rank(list: Video[]): Video[] {
  return [...list].sort(
    (a, b) =>
      Number(isArabic(b.lang)) - Number(isArabic(a.lang)) ||
      (b.stats?.views ?? 0) - (a.stats?.views ?? 0),
  );
}

/**
 * One example video per key (format, dialect…), best first, preferring a different creator for
 * each pick so a section shows range. `exclude` skips videos already shown elsewhere on the page.
 */
export function examplesBy<K extends string>(
  s: DemoState,
  keys: readonly K[],
  match: (video: Video, key: K) => boolean,
  exclude: string[] = [],
): Record<K, Video | undefined> {
  const usedVideos = new Set(exclude);
  const usedCreators = new Set<string>();
  const result = {} as Record<K, Video | undefined>;
  for (const key of keys) {
    const ranked = rank(s.videos.filter((v) => match(v, key) && !usedVideos.has(v.id)));
    const pick = ranked.find((v) => !usedCreators.has(v.creatorId)) ?? ranked[0];
    if (pick) {
      usedVideos.add(pick.id);
      usedCreators.add(pick.creatorId);
    }
    result[key] = pick;
  }
  return result;
}

export const examplesByFormat = (s: DemoState, keys: readonly FormatId[], exclude?: string[]) =>
  examplesBy(s, keys, (video, key) => video.format === key, exclude);

export const examplesByLanguage = (s: DemoState, keys: readonly LanguageId[], exclude?: string[]) =>
  examplesBy(s, keys, (video, key) => video.lang === key, exclude);

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

/**
 * Pick testimonials: preferred ids first (if present), then the strongest five-star reviews
 * from businesses not already shown.
 */
export function pickReviews(s: DemoState, preferred: string[], count = 3): Review[] {
  const picked: Review[] = [];
  const seen = new Set<string>();
  const add = (review: Review | undefined) => {
    if (!review || seen.has(review.businessId) || picked.length >= count) return;
    if (!creatorById(s, review.creatorId)) return;
    picked.push(review);
    seen.add(review.businessId);
  };
  preferred.forEach((id) => add(s.reviews.find((r) => r.id === id)));
  [...s.reviews]
    .filter((r) => r.rating === 5 && r.wouldRehire)
    .sort((a, b) => b.text.length - a.text.length)
    .forEach(add);
  return picked;
}

/** Typical length of a format: "15–40s", "45s–2 min", "1–3 min". */
export function typicalLength([min, max]: [number, number]): string {
  const minutes = (seconds: number) => {
    const value = seconds / 60;
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  };
  if (min >= 60) return `${minutes(min)}–${minutes(max)} min`;
  if (max >= 60) return `${min}s–${minutes(max)} min`;
  return `${min}–${max}s`;
}
