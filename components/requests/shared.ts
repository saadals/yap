/**
 * Pure helpers for custom orders: market guidance from real creator packages (the new-order form's
 * budget range), pitch ranking and sorting, and small order helpers. Safe in render.
 */

import { TZ_OFFSET, at } from "@/lib/clock";
import { daysFromNow, plural } from "@/lib/format";
import { fit, type Fit } from "@/lib/selectors";
import { activeIds, type DemoState } from "@/lib/store";
import { BUDGET_MIN } from "@/lib/taxonomy";
import type { ContentRequest, Creator, FormatId, LanguageId, Pitch } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Order helpers (request sheets, hire sheet)                                  */
/* -------------------------------------------------------------------------- */

/** The lowest budget a custom order can have (the request sheets' budget editor). */
export const BUDGET_FLOOR = BUDGET_MIN;

/** For hook packs the count is hooks (one pack holds up to five); otherwise videos. */
export function deliverableLabel(format: FormatId | null, count: number): string {
  return format === "hook-pack" ? plural(count, "hook") : plural(count, "video");
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
/* Market guidance (money)                                                     */
/* -------------------------------------------------------------------------- */

/**
 * What this creator would usually charge for `count` videos of `durationSec`, from their own
 * packages: the cheapest package that is long enough, with extra videos at a 15% multi-video
 * discount when the package holds fewer than requested.
 */
export function quoteFor(
  creator: Creator,
  count: number,
  durationSec?: number,
): { price: number; days: number } {
  const all = [...creator.packages].sort((a, b) => a.price - b.price);
  if (!all.length) return { price: 0, days: 7 };
  const longEnough = durationSec ? all.filter((p) => p.maxSeconds >= durationSec) : all;
  const options = (longEnough.length ? longEnough : all).map((p) => {
    if (p.videos >= count) return { price: p.price, days: p.deliveryDays };
    const extra = count - p.videos;
    const perVideo = p.price / Math.max(1, p.videos);
    return {
      price: Math.round((p.price + perVideo * extra * 0.85) / 10) * 10,
      days: p.deliveryDays + Math.ceil(extra / 2),
    };
  });
  return options.reduce((best, option) => (option.price < best.price ? option : best));
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const round10 = (n: number) => Math.round(n / 10) * 10;

export type Market = {
  pool: { creator: Creator; price: number; days: number }[];
  count: number;
  low: number;
  high: number;
  median: number;
  typicalDays: number;
  inBudget: number;
  prices: number[];
};

export function marketFor(
  s: DemoState,
  format: FormatId | null,
  languages: LanguageId[],
  videoCount: number,
  budget: { min: number; max: number },
  durationSec?: number,
): Market {
  // A hook pack holds up to five short hooks, so price it per pack rather than per hook.
  const units = format === "hook-pack" ? Math.ceil(videoCount / 5) : videoCount;
  const self = activeIds(s).creatorId;
  const pool = s.creators
    .filter(
      (c) =>
        c.id !== self &&
        (!format || c.formats.includes(format)) &&
        (languages.length === 0 || languages.some((l) => c.languages.includes(l))),
    )
    .map((creator) => ({ creator, ...quoteFor(creator, units, durationSec) }))
    .filter((q) => q.price > 0);
  const prices = pool.map((q) => q.price).sort((a, b) => a - b);
  const days = pool.map((q) => q.days).sort((a, b) => a - b);
  return {
    pool,
    count: pool.length,
    low: round10(quantile(prices, 0.25)),
    high: round10(quantile(prices, 0.75)),
    median: round10(quantile(prices, 0.5)),
    typicalDays: Math.round(quantile(days, 0.5)) || 7,
    inBudget: pool.filter((q) => q.price <= budget.max).length,
    prices,
  };
}

/* -------------------------------------------------------------------------- */
/* Pitches                                                                     */
/* -------------------------------------------------------------------------- */

export type PitchSort = "fit" | "price" | "fastest" | "newest";

export type RankedPitch = { pitch: Pitch; creator: Creator; fit: Fit };

export function rankPitches(
  s: DemoState,
  request: ContentRequest,
  pitches: Pitch[],
): RankedPitch[] {
  return pitches
    .map((pitch) => {
      const creator = s.creators.find((c) => c.id === pitch.creatorId);
      return creator ? { pitch, creator, fit: fit(s, creator, request) } : null;
    })
    .filter((x): x is RankedPitch => x !== null);
}

export function sortPitches(list: RankedPitch[], sort: PitchSort): RankedPitch[] {
  const copy = [...list];
  copy.sort((a, b) => {
    if (sort === "price") return a.pitch.price - b.pitch.price || b.fit.score - a.fit.score;
    if (sort === "fastest")
      return a.pitch.deliveryDays - b.pitch.deliveryDays || b.fit.score - a.fit.score;
    if (sort === "newest") return Date.parse(b.pitch.sentAt) - Date.parse(a.pitch.sentAt);
    return b.fit.score - a.fit.score || Date.parse(b.pitch.sentAt) - Date.parse(a.pitch.sentAt);
  });
  return copy;
}

/** Pitches that still need a decision from the business. */
export const isUndecided = (p: Pitch) => p.status === "sent" || p.status === "viewed";

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return quantile(sorted, 0.5);
}

/** Is a request's brief complete enough to publish? */
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
