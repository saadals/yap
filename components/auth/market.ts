import type { Creator, FormatId, LanguageId, PackageTier } from "@/lib/types";

export const tiers: PackageTier[] = ["basic", "standard", "premium"];

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const roundTo = (value: number, step: number) => Math.max(step, Math.round(value / step) * step);

export type TierGuide = { price: number; deliveryDays: number; revisions: number };

export type MarketGuide = {
  /** Creators the medians were computed from. */
  sample: number;
  /** True when the sample matches the chosen formats/dialects (otherwise all creators). */
  matched: boolean;
  tiers: Record<PackageTier, TierGuide>;
};

const fallback: Record<PackageTier, TierGuide> = {
  basic: { price: 150, deliveryDays: 5, revisions: 1 },
  standard: { price: 280, deliveryDays: 6, revisions: 2 },
  premium: { price: 480, deliveryDays: 8, revisions: 3 },
};

/**
 * Median package price, delivery days and revisions per tier across seed creators who make any
 * of the chosen formats in any of the chosen dialects. Falls back to every creator when fewer
 * than three match, so the guidance never rests on one or two people.
 */
export function marketGuide(
  creators: Creator[],
  formats: FormatId[],
  dialects: LanguageId[],
): MarketGuide {
  const matches = creators.filter(
    (creator) =>
      (formats.length === 0 || creator.formats.some((f) => formats.includes(f))) &&
      (dialects.length === 0 || creator.languages.some((l) => dialects.includes(l))),
  );
  const matched = matches.length >= 3;
  const pool = matched ? matches : creators;
  const result = {} as Record<PackageTier, TierGuide>;
  for (const tier of tiers) {
    const packages = pool.flatMap((creator) => creator.packages.filter((p) => p.tier === tier));
    const price = median(packages.map((p) => p.price));
    const days = median(packages.map((p) => p.deliveryDays));
    const revisions = median(packages.map((p) => p.revisions));
    result[tier] = {
      price: price === null ? fallback[tier].price : roundTo(price, 5),
      deliveryDays: Math.min(14, Math.max(1, days === null ? fallback[tier].deliveryDays : Math.round(days))),
      revisions: Math.min(4, Math.max(0, revisions === null ? fallback[tier].revisions : Math.round(revisions))),
    };
  }
  // Keep the ladder strictly ascending so suggested prices always pass validation.
  result.standard.price = Math.max(result.standard.price, result.basic.price + 20);
  result.premium.price = Math.max(result.premium.price, result.standard.price + 20);
  return { sample: pool.length, matched, tiers: result };
}
