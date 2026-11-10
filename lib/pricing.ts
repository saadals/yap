/**
 * Price guidance for a UGC campaign: the usual range per Yapp, scaled by product category and
 * follower tier (round 3 answers, item 29). Every number lives here and nowhere else.
 *
 *   low  = max(30, round5(154 × category × tier))
 *   high = max(low + 20, round5(198 × category × tier))
 *
 * Example: AI tools at 10K–20K → $110–$140; at 50K–100K → $215–$275.
 *
 * The range is advice, never a rule: the only hard limits are the $30 floor and the $5,000 ceiling
 * per Yapp (lib/taxonomy.tsx). The default price is `low`, so the default never warns; below `low`
 * the note turns red and offers "Use $low", without blocking. The range is the listed price, what
 * the brand pays; creators see their net (80%) beside it.
 */

import { PRICE_MAX_PER_YAPP, PRICE_MIN_PER_YAPP } from "./taxonomy";
import type { FollowerTierId, NicheId } from "./types";

/** Base figures per Yapp before scaling (industry estimates). */
export const GUIDANCE_BASE = { low: 154, high: 198 } as const;

/** The smallest gap between the low and high end of a range. */
export const GUIDANCE_MIN_SPREAD = 20;

/** Category factors (industry estimates). */
export const CATEGORY_FACTORS: Record<NicheId, number> = {
  ai: 1.4,
  consumer: 1.3,
  b2b: 1.5,
  fintech: 1.5,
  gadgets: 1.3,
  gaming: 1.2,
  health: 1.4,
  ecommerce: 1.3,
};

/** Used when no category is chosen yet. */
export const NO_CATEGORY_FACTOR = 1.3;

/** Follower tier factors (Yapp's own estimates, approved by the owner). */
export const TIER_FACTORS: Record<FollowerTierId, number> = {
  t10: 0.5,
  t20: 0.7,
  t50: 1.0,
  t100: 1.3,
  t250: 1.7,
};

/** The note under the range. It names no source on purpose (item 29: "industry estimates"). */
export const GUIDANCE_NOTE =
  "Based on industry estimates for this category and Yapp's own estimates for this follower tier. It's a guide, not a rule.";

/** Nearest multiple of 5. */
export const round5 = (value: number) => Math.round(value / 5) * 5;

export type PriceGuidance = { low: number; high: number };

/** The usual price range per Yapp (listed price) for a category and tier. */
export function priceGuidance(niche: NicheId | undefined, tierId: FollowerTierId): PriceGuidance {
  const scale = (niche ? CATEGORY_FACTORS[niche] : NO_CATEGORY_FACTOR) * TIER_FACTORS[tierId];
  const low = Math.min(PRICE_MAX_PER_YAPP, Math.max(PRICE_MIN_PER_YAPP, round5(GUIDANCE_BASE.low * scale)));
  const high = Math.min(
    PRICE_MAX_PER_YAPP,
    Math.max(low + GUIDANCE_MIN_SPREAD, round5(GUIDANCE_BASE.high * scale)),
  );
  return { low, high };
}

/** Where a price sits against its range: below warns (red, "Use $low"), never blocks. */
export function rangePosition(price: number, range: PriceGuidance): "below" | "within" | "above" {
  if (price < range.low) return "below";
  if (price > range.high) return "above";
  return "within";
}
