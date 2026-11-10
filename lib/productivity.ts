/**
 * Productivity: the statistics page for both sides of the marketplace (Site-wide spec 5.9; round 3
 * answers, items 17, 20 and 36). Pure functions over the demo state, for one side and one date range.
 *
 * Only figures the platform can compute from its own records: commissions, deliveries, events,
 * pitches, payments and reviews. Nothing here comes from an ad account (none can be connected in
 * this version): CAC, ROAS, CTR, hook rate, reach and CPA are listed by name in `adMetrics` and have
 * no value at all. A creator's on-time and repeat rates are computed from the records, never read
 * from the fixed numbers on their profile.
 *
 * The minimum-data rule (5.9.6): below a figure's minimum its value is `null`, shown as "—" with
 * "Not enough data yet", never as a misleading 0% or 100%. Money and counts have no minimum ($0 and
 * 0 are true). Every figure carries its definition for the info note.
 *
 * Ranges end at the demo's "now" (the clock is fixed, lib/clock.ts) and include both ends: the last
 * 7, 30 or 90 calendar days in display time, or the last 365 for "12 months". The comparison is the
 * same number of days just before. Anything stamped after "now" (the runtime clock creeps forward
 * while the demo is open) belongs to the current period.
 *
 * Money agrees with the other pages by construction: spend is what Billing calls spent (listed
 * prices released, campaign slots once paid out), held comes from `businessSpend()`, earnings are the
 * nets Wallet lists under "Released to you", withdrawable and pending come from `creatorEarnings()`.
 * Wallet's six-month bars and lifetime add an estimate for work before the seed window; this page
 * shows records only, so those two are the one place the pages differ.
 */

import { DAY, HOUR, NOW, TZ_OFFSET } from "./clock";
import { moneyExact, num, plural, shortDate } from "./format";
import {
  businessById,
  businessSpend,
  commissionTotals,
  creatorById,
  creatorEarnings,
  isAdCopy,
  isCampaign,
  openSlotCount,
} from "./selectors";
import type { DemoState } from "./store";
import { activeIds } from "./store";
import { FEE_PCT } from "./taxonomy";
import type { Business, Commission, CommissionEventKind, Creator, Pitch } from "./types";

/* -------------------------------------------------------------------------- */
/* Sides and ranges                                                            */
/* -------------------------------------------------------------------------- */

/** "brand": the account's buyer profile; "creator": its creator profile. */
export type ProductivitySide = "brand" | "creator";
export type RangeId = "7d" | "30d" | "90d" | "12m";

export const PRODUCTIVITY_RANGES: { id: RangeId; label: string; short: string; days: number; points: number }[] = [
  { id: "7d", label: "Last 7 days", short: "7 days", days: 7, points: 7 },
  { id: "30d", label: "Last 30 days", short: "30 days", days: 30, points: 30 },
  { id: "90d", label: "Last 90 days", short: "90 days", days: 90, points: 13 },
  { id: "12m", label: "Last 12 months", short: "12 months", days: 365, points: 12 },
];
export const DEFAULT_RANGE: RangeId = "30d";
export const isRangeId = (value: string | null | undefined): value is RangeId =>
  PRODUCTIVITY_RANGES.some((r) => r.id === value);
export const isSide = (value: string | null | undefined): value is ProductivitySide =>
  value === "brand" || value === "creator";

/** The sides this account has: every account can order; only a creator profile can make. */
export function productivitySides(s: DemoState): ProductivitySide[] {
  return activeIds(s).creatorId ? ["creator", "brand"] : ["brand"];
}

/** The side a page opens on: the creator view when there is a creator profile (spec 5.9.2). */
export function defaultSide(s: DemoState): ProductivitySide {
  return productivitySides(s)[0];
}

/** The side asked for (`?as=`), if this account has it; otherwise the default. */
export function resolveSide(s: DemoState, wanted: string | null | undefined): ProductivitySide {
  return isSide(wanted) && productivitySides(s).includes(wanted) ? wanted : defaultSide(s);
}

export type Period = {
  range: RangeId;
  /** "Last 30 days" */
  label: string;
  /** "previous 30 days", for "vs previous 30 days". */
  compareLabel: string;
  /** Start of the first day (ms). The period runs to "now" and includes anything stamped later. */
  from: number;
  /** End of today in display time (ms), for labels. */
  to: number;
  /** Start of the comparison period (ms); it ends where this one starts. */
  prevFrom: number;
  /** Chart points: each point's end as an offset from `from` (ms). */
  ends: number[];
  /** One label per point, its last day ("Oct 15"). */
  labels: string[];
  /** Three ticks under the chart. */
  axis: string[];
  /** "Oct 6 – Nov 4, 2026" and the same for the comparison, for the CSV file. */
  span: string;
  prevSpan: string;
};

const startOfDay = (ms: number) => Math.floor((ms + TZ_OFFSET) / DAY) * DAY - TZ_OFFSET;
const yearOf = (ms: number) => new Date(ms + TZ_OFFSET).getUTCFullYear();
const spanLabel = (from: number, lastDay: number) =>
  `${shortDate(new Date(from).toISOString())} – ${shortDate(new Date(lastDay).toISOString())}, ${yearOf(lastDay)}`;

export function periodFor(range: RangeId): Period {
  const info = PRODUCTIVITY_RANGES.find((r) => r.id === range) ?? PRODUCTIVITY_RANGES[1];
  const today = startOfDay(NOW);
  const from = today - (info.days - 1) * DAY;
  const to = today + DAY - 1;
  const prevFrom = from - info.days * DAY;
  const endDays = Array.from({ length: info.points }, (_, i) => Math.round(((i + 1) * info.days) / info.points));
  const ends = endDays.map((d) => d * DAY - 1);
  const labels = endDays.map((d) => shortDate(new Date(from + (d - 1) * DAY + 12 * HOUR).toISOString()));
  const mid = Math.floor((labels.length - 1) / 2);
  return {
    range: info.id,
    label: info.label,
    compareLabel: `previous ${info.short}`,
    from,
    to,
    prevFrom,
    ends,
    labels,
    axis: [labels[0], labels[mid], labels[labels.length - 1]],
    span: spanLabel(from, to),
    prevSpan: spanLabel(prevFrom, from - 1),
  };
}

/** A stretch of time: `from` inclusive, `to` exclusive (Infinity = up to now and beyond). */
type Window = { from: number; to: number };
const inWindow = (t: number | undefined, w: Window) => t !== undefined && t >= w.from && t < w.to;

/** The current period, the previous one, and the cumulative windows behind each chart point. */
function windows(period: Period) {
  const current: Window = { from: period.from, to: Infinity };
  const previous: Window = { from: period.prevFrom, to: period.from };
  const last = period.ends.length - 1;
  const points = period.ends.map((end, i): Window => ({ from: period.from, to: i === last ? Infinity : period.from + end + 1 }));
  const prevPoints = period.ends.map((end): Window => ({ from: period.prevFrom, to: period.prevFrom + end + 1 }));
  return { current, previous, points, prevPoints };
}

/* -------------------------------------------------------------------------- */
/* Reading the records                                                         */
/* -------------------------------------------------------------------------- */

const ms = (iso: string | undefined) => (iso ? Date.parse(iso) : undefined);
const lastEventAt = (c: Commission, kind: CommissionEventKind) => {
  for (let i = c.events.length - 1; i >= 0; i--) if (c.events[i].kind === kind) return ms(c.events[i].at);
  return undefined;
};

/** When the brand approved the work (undefined = not approved). */
function approvedAt(c: Commission): number | undefined {
  if (c.status !== "completed") return undefined;
  return lastEventAt(c, "approved") ?? ms(c.completedAt);
}

/**
 * When the money was released to the creator (undefined = not released): on approval for orders;
 * for a campaign slot, when its 7 days after the verified post ran out.
 */
function releasedAt(c: Commission): number | undefined {
  if (c.payment.status !== "released") return undefined;
  if (c.source === "campaign") return lastEventAt(c, "payout_available") ?? ms(c.withdrawableFrom) ?? ms(c.completedAt);
  return ms(c.completedAt) ?? lastEventAt(c, "paid") ?? ms(c.createdAt);
}

/** When the work started (undefined = an offer not accepted, or declined). */
function hiredAt(c: Commission): number | undefined {
  if (c.status === "offered" || c.status === "declined") return undefined;
  return ms(c.acceptedAt) ?? ms(c.createdAt);
}

/** Work in this window: hired by its end and not finished before its start. Cancelled work isn't counted. */
function activeIn(c: Commission, w: Window): boolean {
  const start = hiredAt(c);
  if (start === undefined || c.status === "cancelled") return false;
  const end = c.status === "completed" ? (ms(c.completedAt) ?? start) : Infinity;
  return start < w.to && end >= w.from;
}

const videosIn = (c: Commission) => (isAdCopy(c) ? 0 : Math.max(1, c.brief.videoCount));
const firstVersion = (c: Commission) => c.deliveries.find((d) => d.version === 1) ?? c.deliveries[0];
const approvedVersion = (c: Commission) =>
  c.deliveries.find((d) => d.status === "approved")?.version ?? c.deliveries[c.deliveries.length - 1]?.version;

type Rate = { hit: number; of: number };
const addRate = (a: Rate, b: Rate): Rate => ({ hit: a.hit + b.hit, of: a.of + b.of });
const NO_RATE: Rate = { hit: 0, of: 0 };

/** First versions delivered in the window, and how many arrived by the due date. */
function onTime(list: Commission[], w: Window): Rate {
  return list.reduce((rate, c) => {
    const v1 = firstVersion(c);
    const at = ms(v1?.deliveredAt);
    if (!v1 || !inWindow(at, w)) return rate;
    return addRate(rate, { hit: at! <= Date.parse(c.dueDate) ? 1 : 0, of: 1 });
  }, NO_RATE);
}

/** Orders approved in the window, and how many on version 1. */
function firstPass(list: Commission[], w: Window): Rate {
  return list.reduce(
    (rate, c) => (inWindow(approvedAt(c), w) ? addRate(rate, { hit: approvedVersion(c) === 1 ? 1 : 0, of: 1 }) : rate),
    NO_RATE,
  );
}

/** Hours from each version delivered in the window to the brand's answer (approval or changes). */
function reviewHours(list: Commission[], w: Window): number[] {
  const answers: CommissionEventKind[] = ["approved", "revision_requested", "video_rejected"];
  return list.flatMap((c) =>
    c.deliveries.flatMap((d) => {
      const at = Date.parse(d.deliveredAt);
      if (!inWindow(at, w) || d.status === "in_review") return [];
      const answer = c.events.find((e) => answers.includes(e.kind) && Date.parse(e.at) >= at);
      return answer ? [(Date.parse(answer.at) - at) / HOUR] : [];
    }),
  );
}

/** Changes asked for in the window (one per change request). */
const changesAsked = (list: Commission[], w: Window) =>
  list.reduce((sum, c) => sum + c.events.filter((e) => e.kind === "revision_requested" && inWindow(ms(e.at), w)).length, 0);

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const cents = (amount: number) => Math.round(amount * 100) / 100;

/* -------------------------------------------------------------------------- */
/* Figures                                                                     */
/* -------------------------------------------------------------------------- */

export type FigureId =
  | "spend"
  | "videos"
  | "costPerVideo"
  | "onTime"
  | "firstPass"
  | "avgRevisions"
  | "reviewTime"
  | "pitchesPerOrder"
  | "timeToHire"
  | "earnings"
  | "rehire"
  | "winRate";

/** money: dollars; count; pct: a share from 0 to 1; hours; days; ratio: an average count. */
export type FigureUnit = "money" | "count" | "pct" | "hours" | "days" | "ratio";

export type Delta = {
  /** "18%" or "6 pts". */
  label: string;
  direction: "up" | "down";
  /** The change is in the good direction (null: the figure has no better direction, like spend). */
  good: boolean | null;
  /** "Up 18% on the previous 30 days", for screen readers and the CSV file. */
  text: string;
};

export type Figure = {
  id: FigureId;
  label: string;
  unit: FigureUnit;
  /** null = not enough data yet (shown as "—"). */
  value: number | null;
  /** "$180", "100%", "24h" or "—". */
  display: string;
  previous: number | null;
  previousDisplay: string;
  /** Change against the previous period; null when either side is unknown, zero or unchanged. */
  delta: Delta | null;
  /** The figure at each chart point, for a sparkline (empty when there aren't two points). */
  spark: number[];
  /** What the value rests on: "7 of 8 first versions on time", or why it's "—". */
  basis: string;
  /** How it's computed, for the info note. */
  definition: string;
  /** The minimum, when there is one: "Shows once 3 first versions have arrived." */
  minimum?: string;
  /** Which way is better; null when neither is (a brand's spend, how many videos it ordered). */
  better: "up" | "down" | null;
};

export const NOT_ENOUGH = "Not enough data yet";

export function formatFigure(value: number | null, unit: FigureUnit): string {
  if (value === null) return "—";
  switch (unit) {
    case "money":
      return moneyExact(value);
    case "count":
      return num(Math.round(value));
    case "pct":
      return `${Math.round(value * 100)}%`;
    case "hours":
      return value < 48 ? `${Math.max(1, Math.round(value))}h` : `${(value / 24).toFixed(1)} days`;
    case "days":
      return value < 1 ? `${Math.max(1, Math.round(value * 24))}h` : `${value.toFixed(1)} days`;
    case "ratio":
      return value.toFixed(1);
  }
}

function deltaOf(value: number | null, previous: number | null, unit: FigureUnit, better: "up" | "down" | null, compareLabel: string): Delta | null {
  if (value === null || previous === null) return null;
  if (unit === "pct") {
    const pts = Math.round(value * 100) - Math.round(previous * 100);
    if (pts === 0) return null;
    const direction = pts > 0 ? "up" : "down";
    const label = plural(Math.abs(pts), "pt");
    return { label, direction, good: better === null ? null : direction === better, text: `${direction === "up" ? "Up" : "Down"} ${label} on the ${compareLabel}` };
  }
  if (previous <= 0) return null;
  const pct = Math.round(((value - previous) / previous) * 100);
  if (pct === 0) return null;
  const direction = pct > 0 ? "up" : "down";
  const label = `${Math.abs(pct)}%`;
  return { label, direction, good: better === null ? null : direction === better, text: `${direction === "up" ? "Up" : "Down"} ${label} on the ${compareLabel}` };
}

/** One measurement of a figure in a window: its value (null below the minimum) and its basis. */
type Reading = { value: number | null; basis: string };

type FigureSpec = {
  id: FigureId;
  label: string;
  unit: FigureUnit;
  better: "up" | "down" | null;
  definition: string;
  minimum?: string;
  read: (w: Window) => Reading;
};

function buildFigure(spec: FigureSpec, period: Period): Figure {
  const { current, previous, points } = windows(period);
  const now = spec.read(current);
  const before = spec.read(previous);
  const spark = points.map((w) => spec.read(w).value);
  const firstKnown = spark.findIndex((v) => v !== null);
  const sparkValues = firstKnown < 0 ? [] : (spark.slice(firstKnown).map((v, i, all) => v ?? all[i - 1] ?? 0) as number[]);
  return {
    id: spec.id,
    label: spec.label,
    unit: spec.unit,
    better: spec.better,
    value: now.value,
    display: formatFigure(now.value, spec.unit),
    previous: before.value,
    previousDisplay: formatFigure(before.value, spec.unit),
    delta: deltaOf(now.value, before.value, spec.unit, spec.better, period.compareLabel),
    spark: sparkValues.length > 1 ? sparkValues : [],
    basis: now.basis,
    definition: spec.definition,
    minimum: spec.minimum,
  };
}

/** A share with a minimum count: "7 of 8 first versions on time", or "—" under the minimum. */
const rateReading = (rate: Rate, min: number, noun: string, hitWord: string, nouns = `${noun}s`): Reading =>
  rate.of >= min
    ? { value: rate.hit / rate.of, basis: `${num(rate.hit)} of ${plural(rate.of, noun, nouns)} ${hitWord}` }
    : { value: null, basis: rate.of ? `${NOT_ENOUGH}: ${plural(rate.of, noun, nouns)} so far` : NOT_ENOUGH };

/** An average with a minimum count. */
const averageReading = (values: number[], min: number, basis: (n: number) => string): Reading =>
  values.length >= min
    ? { value: sum(values) / values.length, basis: basis(values.length) }
    : { value: null, basis: values.length ? `${NOT_ENOUGH}: ${basis(values.length)}` : NOT_ENOUGH };

/** Cumulative chart series of a money figure, and the previous period's at the same points. */
function moneySeries(period: Period, total: (w: Window) => number) {
  const { points, prevPoints } = windows(period);
  return {
    values: points.map((w) => cents(total(w))),
    compare: prevPoints.map((w) => cents(total(w))),
    labels: period.labels,
    axis: period.axis,
  };
}

export type Series = ReturnType<typeof moneySeries>;

/** Figures that need a connected ad account. They are names only: nothing here has a value. */
export type AdMetric = { id: "cac" | "roas" | "ctr" | "hookRate" | "reach"; label: string };
export const AD_ACCOUNT_LINE = "Connect an ad account";

/* -------------------------------------------------------------------------- */
/* Brand side                                                                  */
/* -------------------------------------------------------------------------- */

export type StatusLook = "waiting" | "moving" | "done" | "attention" | "negative";

/** One status on the brand's open work, right now (not tied to the range). */
export type OpenWorkRow = { id: string; label: string; look: StatusLook; count: number; hint: string };

export type CreatorRow = {
  creator: Creator;
  /** Orders active in the period (campaign slots count one each). */
  orders: number;
  /** Videos approved in the period. */
  videos: number;
  onTime: Rate;
  firstPass: Rate;
  /** Change requests in the period. */
  changes: number;
  /** Released to this creator in the period, at listed prices. */
  spend: number;
  /** The brand's average rating on this period's orders (reviews and campaign quick ratings). */
  rating: number | null;
  /** Every order with this creator, newest first (declined offers left out). */
  commissions: Commission[];
};

export type BrandReport = {
  side: "brand";
  period: Period;
  business: Business;
  /** False for a buyer profile that has never ordered: the page shows a start, not empty figures. */
  hasHistory: boolean;
  /** Spend first (the hero), then videos, cost per video, on-time and first-pass. */
  kpis: Figure[];
  adMetrics: AdMetric[];
  /** Spend so far in the period, against the previous period at the same point. */
  series: Series;
  people: CreatorRow[];
  openWork: OpenWorkRow[];
  /** Review time, average revisions, pitches per order, time to hire. */
  speed: Figure[];
  money: { held: number; campaignHeld: number; authorized: number };
};

export function brandReport(s: DemoState, range: RangeId, businessId: string = activeIds(s).businessId): BrandReport {
  const period = periodFor(range);
  const business = businessById(s, businessId)!;
  const mine = s.commissions.filter((c) => c.businessId === businessId);
  const requests = s.requests.filter((r) => r.businessId === businessId && r.status !== "draft");
  const customOrders = requests.filter((r) => !isCampaign(r));
  const total = (c: Commission) => commissionTotals(c).total;

  const spendIn = (w: Window) => sum(mine.filter((c) => inWindow(releasedAt(c), w)).map(total));
  const approvedIn = (w: Window) => mine.filter((c) => inWindow(approvedAt(c), w) && videosIn(c) > 0);
  const pitchesFor = (requestId: string) => s.pitches.filter((p) => p.requestId === requestId && p.status !== "withdrawn");

  const figures: FigureSpec[] = [
    {
      id: "spend",
      label: "Spend on Yapp",
      unit: "money",
      // Spending less isn't bad news, and spending more isn't good news: no colour either way.
      better: null,
      definition:
        "What you paid for work released in this period: the listed price plus add-ons, nothing on top. Money still held for work in progress counts once it's released.",
      read: (w) => {
        const released = mine.filter((c) => inWindow(releasedAt(c), w));
        return { value: cents(sum(released.map(total))), basis: `${plural(released.length, "order")} released` };
      },
    },
    {
      id: "videos",
      label: "Videos delivered",
      unit: "count",
      // How many videos a brand orders is its choice, not a result.
      better: null,
      definition:
        "Videos you approved in this period. A campaign video counts when you approve it, before it's posted. Ad copy isn't a video, so it isn't counted.",
      read: (w) => {
        const list = approvedIn(w);
        return { value: sum(list.map(videosIn)), basis: `${plural(list.length, "order")} approved` };
      },
    },
    {
      id: "costPerVideo",
      label: "Cost per video",
      unit: "money",
      better: "down",
      definition:
        "The average price of the videos you approved in this period, add-ons included, whether the money is released yet or still held.",
      minimum: "Shows once you've approved a video.",
      read: (w) => {
        const list = approvedIn(w);
        const videos = sum(list.map(videosIn));
        return videos >= 1
          ? { value: cents(sum(list.map(total)) / videos), basis: `${moneyExact(sum(list.map(total)))} for ${plural(videos, "video")}` }
          : { value: null, basis: NOT_ENOUGH };
      },
    },
    {
      id: "onTime",
      label: "On-time rate",
      unit: "pct",
      better: "up",
      definition:
        "First versions that arrived on or before their due date, out of the first versions creators delivered to you in this period.",
      minimum: "Shows once 3 first versions have arrived.",
      read: (w) => rateReading(onTime(mine, w), 3, "first version", "on time"),
    },
    {
      id: "firstPass",
      label: "First-pass approval",
      unit: "pct",
      better: "up",
      definition: "Orders you approved on the first version, out of the orders you approved in this period.",
      minimum: "Shows once you've approved 3 orders.",
      read: (w) => rateReading(firstPass(mine, w), 3, "approved order", "on the first version"),
    },
  ];

  const speedSpecs: FigureSpec[] = [
    {
      id: "reviewTime",
      label: "Your review time",
      unit: "hours",
      better: "down",
      definition:
        "How long you take to approve a version or ask for changes, on average, for versions delivered to you in this period. Versions still waiting for you aren't counted yet.",
      minimum: "Shows once you've reviewed 3 versions.",
      read: (w) => averageReading(reviewHours(mine, w), 3, (n) => `${plural(n, "version")} reviewed`),
    },
    {
      id: "avgRevisions",
      label: "Changes per order",
      unit: "ratio",
      better: "down",
      definition: "Rounds of changes you asked for, on average, on the orders you approved in this period.",
      minimum: "Shows once you've approved 3 orders.",
      read: (w) =>
        averageReading(
          mine.filter((c) => inWindow(approvedAt(c), w)).map((c) => c.revisionsUsed),
          3,
          (n) => `${plural(n, "approved order")}`,
        ),
    },
    {
      id: "pitchesPerOrder",
      label: "Pitches per order",
      unit: "ratio",
      better: "up",
      definition: "Pitches received per custom order you posted in this period, invite-only orders included.",
      minimum: "Shows once you've posted 3 custom orders.",
      read: (w) =>
        averageReading(
          customOrders.filter((r) => inWindow(ms(r.postedAt), w)).map((r) => pitchesFor(r.id).length),
          3,
          (n) => `${plural(n, "custom order")} posted`,
        ),
    },
    {
      id: "timeToHire",
      label: "Time to hire",
      unit: "days",
      better: "down",
      definition: "Days from posting a custom order to hiring someone for it, on average, for hires made in this period.",
      minimum: "Shows once you've hired from 3 custom orders.",
      read: (w) =>
        averageReading(
          customOrders.flatMap((r) => {
            const hire = mine
              .filter((c) => c.requestId === r.id && c.source === "request")
              .map((c) => Date.parse(c.createdAt))
              .sort((a, b) => a - b)[0];
            return hire !== undefined && inWindow(hire, w) ? [(hire - Date.parse(r.postedAt)) / DAY] : [];
          }),
          3,
          (n) => `${plural(n, "hire")}`,
        ),
    },
  ];

  const current = windows(period).current;
  const byCreator = new Map<string, Commission[]>();
  for (const c of mine) {
    if (c.status === "declined") continue;
    byCreator.set(c.creatorId, [...(byCreator.get(c.creatorId) ?? []), c]);
  }
  const people: CreatorRow[] = [...byCreator.entries()]
    .flatMap(([creatorId, list]) => {
      const creator = creatorById(s, creatorId);
      const active = list.filter((c) => activeIn(c, current));
      if (!creator || !active.length) return [];
      const ratings = active.flatMap((c) => {
        const review = c.reviewId ? s.reviews.find((r) => r.id === c.reviewId) : undefined;
        return review ? [review.rating] : c.quickRating ? [c.quickRating] : [];
      });
      return [
        {
          creator,
          orders: active.length,
          videos: sum(list.filter((c) => inWindow(approvedAt(c), current)).map(videosIn)),
          onTime: onTime(list, current),
          firstPass: firstPass(list, current),
          changes: changesAsked(list, current),
          spend: cents(sum(list.filter((c) => inWindow(releasedAt(c), current)).map(total))),
          rating: ratings.length ? sum(ratings) / ratings.length : null,
          commissions: [...list].sort((a, b) => (hiredAt(b) ?? Date.parse(b.createdAt)) - (hiredAt(a) ?? Date.parse(a.createdAt))),
        },
      ];
    })
    .sort((a, b) => b.spend - a.spend || b.orders - a.orders || a.creator.name.localeCompare(b.creator.name));

  const postStillDue = (c: Commission) =>
    c.source === "campaign" && c.status === "completed" && c.post?.status !== "live";
  const openWork: OpenWorkRow[] = [
    {
      id: "review",
      label: "Needs your review",
      look: "attention" as const,
      count: mine.filter((c) => c.status === "delivered").length,
      hint: "Versions and campaign review copies waiting for you",
    },
    {
      id: "progress",
      label: "In progress",
      look: "moving" as const,
      count: mine.filter((c) => c.status === "in_progress" || c.status === "revision" || postStillDue(c)).length,
      hint: "Being made, changed, or posted by the creator",
    },
    {
      id: "offers",
      label: "Offers waiting",
      look: "waiting" as const,
      count: mine.filter((c) => c.status === "offered").length,
      hint: "Direct offers the creator hasn't answered yet",
    },
    {
      id: "pitching",
      label: "Taking pitches",
      look: "waiting" as const,
      count: customOrders.filter((r) => r.status === "open").length,
      hint: "Custom orders open for pitches",
    },
    {
      id: "slots",
      label: "Open campaign slots",
      look: "waiting" as const,
      count: requests.filter((r) => isCampaign(r)).reduce((n, r) => n + openSlotCount(s, r), 0),
      hint: "Slots no creator has picked yet",
    },
    {
      id: "disputed",
      label: "In dispute",
      look: "negative" as const,
      count: mine.filter((c) => c.status === "disputed").length,
      hint: "A person from Yapp replies within 48 hours",
    },
  ].filter((row) => row.count > 0);

  const spend = businessSpend(s, businessId);
  return {
    side: "brand",
    period,
    business,
    hasHistory: mine.some((c) => c.status !== "declined") || requests.length > 0,
    kpis: figures.map((spec) => buildFigure(spec, period)),
    adMetrics: [
      { id: "cac", label: "CAC" },
      { id: "roas", label: "ROAS" },
      { id: "ctr", label: "CTR" },
    ],
    series: moneySeries(period, spendIn),
    people,
    openWork,
    speed: speedSpecs.map((spec) => buildFigure(spec, period)),
    money: { held: spend.held, campaignHeld: spend.campaignHeld, authorized: spend.authorized },
  };
}

/* -------------------------------------------------------------------------- */
/* Creator side                                                                */
/* -------------------------------------------------------------------------- */

export type BrandRow = {
  business: Business;
  /** Orders active in the period. */
  orders: number;
  /** What you received from this brand in the period, after the fee. */
  earned: number;
  /** Their average time to answer your versions delivered in the period (null = none answered yet). */
  reviewHours: number | null;
  /** Change requests in the period. */
  changes: number;
  /** Their average rating of you on this period's orders. */
  ratedYou: number | null;
  /** They've ordered from you more than once (offers you accepted count). */
  repeat: boolean;
  commissions: Commission[];
};

export type FunnelStep = { id: "sent" | "viewed" | "shortlisted" | "hired"; label: string; count: number };

export type CreatorReport = {
  side: "creator";
  period: Period;
  creator: Creator;
  hasHistory: boolean;
  /** Earnings first (the hero), then videos, on-time, first-pass and rehire rate. */
  kpis: Figure[];
  adMetrics: AdMetric[];
  /** Earnings so far in the period, against the previous period at the same point. */
  series: Series;
  people: BrandRow[];
  /** Pitches sent in the period, by how far they got. */
  funnel: FunnelStep[];
  winRate: Figure;
  /** From `creatorEarnings()`, the same figures Wallet shows. */
  money: { held: number; waitingOnPost: number; pending: number; withdrawable: number };
  /** As on the public profile. */
  rating: { value: number; count: number };
};

/** Orders the creator accepted (cancelled ones included: the brand did order). */
const acceptedOrder = (c: Commission) => hiredAt(c) !== undefined;

export function creatorReport(s: DemoState, range: RangeId, creatorId: string | undefined = activeIds(s).creatorId): CreatorReport | undefined {
  const creator = creatorId ? creatorById(s, creatorId) : undefined;
  if (!creator) return undefined;
  const period = periodFor(range);
  const mine = s.commissions.filter((c) => c.creatorId === creator.id);
  const myPitches = s.pitches.filter((p) => p.creatorId === creator.id && p.status !== "withdrawn");
  const net = (c: Commission) => commissionTotals(c).creatorEarns;
  const earnedIn = (w: Window) => sum(mine.filter((c) => inWindow(releasedAt(c), w)).map(net));
  const ordersWith = (businessId: string) => mine.filter((c) => c.businessId === businessId && acceptedOrder(c)).length;

  const brandsIn = (w: Window) => [...new Set(mine.filter((c) => activeIn(c, w)).map((c) => c.businessId))];
  const pitchesIn = (w: Window) => myPitches.filter((p) => inWindow(ms(p.sentAt), w));
  const decided = (list: Pitch[]): Rate => ({
    hit: list.filter((p) => p.status === "hired").length,
    of: list.filter((p) => p.status === "hired" || p.status === "declined").length,
  });

  const specs: FigureSpec[] = [
    {
      id: "earnings",
      label: "Earnings",
      unit: "money",
      better: "up",
      definition: `What you received for work released in this period, after the ${FEE_PCT}% Yapp fee. Campaign pay counts once it's released, 7 days after your post is verified.`,
      read: (w) => {
        const released = mine.filter((c) => inWindow(releasedAt(c), w));
        return { value: cents(sum(released.map(net))), basis: `${plural(released.length, "order")} released` };
      },
    },
    {
      id: "videos",
      label: "Videos delivered",
      unit: "count",
      better: "up",
      definition: "Videos brands approved in this period, campaign videos included. Ad copy isn't a video, so it isn't counted.",
      read: (w) => {
        const list = mine.filter((c) => inWindow(approvedAt(c), w) && videosIn(c) > 0);
        return { value: sum(list.map(videosIn)), basis: `${plural(list.length, "order")} approved` };
      },
    },
    {
      id: "onTime",
      label: "On-time rate",
      unit: "pct",
      better: "up",
      definition: "Your first versions delivered on or before the due date, out of the first versions you delivered in this period.",
      minimum: "Shows once you've delivered 3 first versions.",
      read: (w) => rateReading(onTime(mine, w), 3, "first version", "on time"),
    },
    {
      id: "firstPass",
      label: "First-pass approval",
      unit: "pct",
      better: "up",
      definition: "Orders approved on your first version, out of the orders brands approved in this period.",
      minimum: "Shows once 3 orders are approved.",
      read: (w) => rateReading(firstPass(mine, w), 3, "approved order", "on the first version"),
    },
    {
      id: "rehire",
      label: "Rehire rate",
      unit: "pct",
      better: "up",
      definition: "Brands you worked with in this period that have ordered from you more than once, out of all the brands you worked with.",
      minimum: "Shows once you've worked with 3 brands.",
      read: (w) => {
        const brands = brandsIn(w);
        return rateReading({ hit: brands.filter((b) => ordersWith(b) >= 2).length, of: brands.length }, 3, "brand", "ordered again");
      },
    },
  ];

  const winSpec: FigureSpec = {
    id: "winRate",
    label: "Win rate",
    unit: "pct",
    better: "up",
    definition: "Pitches that got you hired, out of the pitches brands decided on (hired or declined), for pitches you sent in this period.",
    minimum: "Shows once brands have decided on 3 of your pitches.",
    read: (w) => rateReading(decided(pitchesIn(w)), 3, "decided pitch", "won", "decided pitches"),
  };

  const current = windows(period).current;
  const byBrand = new Map<string, Commission[]>();
  for (const c of mine) {
    if (c.status === "declined") continue;
    byBrand.set(c.businessId, [...(byBrand.get(c.businessId) ?? []), c]);
  }
  const people: BrandRow[] = [...byBrand.entries()]
    .flatMap(([businessId, list]) => {
      const business = businessById(s, businessId);
      const active = list.filter((c) => activeIn(c, current));
      if (!business || !active.length) return [];
      const hours = reviewHours(list, current);
      const ratings = active.flatMap((c) => {
        const review = c.reviewId ? s.reviews.find((r) => r.id === c.reviewId) : undefined;
        return review ? [review.rating] : c.quickRating ? [c.quickRating] : [];
      });
      return [
        {
          business,
          orders: active.length,
          earned: cents(sum(list.filter((c) => inWindow(releasedAt(c), current)).map(net))),
          reviewHours: hours.length ? sum(hours) / hours.length : null,
          changes: changesAsked(list, current),
          ratedYou: ratings.length ? sum(ratings) / ratings.length : null,
          repeat: ordersWith(businessId) >= 2,
          commissions: [...list].sort((a, b) => (hiredAt(b) ?? Date.parse(b.createdAt)) - (hiredAt(a) ?? Date.parse(a.createdAt))),
        },
      ];
    })
    .sort((a, b) => b.earned - a.earned || b.orders - a.orders || a.business.name.localeCompare(b.business.name));

  const sent = pitchesIn(current);
  const viewed = sent.filter((p) => p.status !== "sent");
  const shortlisted = sent.filter((p) => p.status === "shortlisted" || p.status === "hired");
  const hired = sent.filter((p) => p.status === "hired");
  const earnings = creatorEarnings(s, creator.id);

  return {
    side: "creator",
    period,
    creator,
    hasHistory: mine.some((c) => c.status !== "declined") || myPitches.length > 0,
    kpis: specs.map((spec) => buildFigure(spec, period)),
    adMetrics: [
      { id: "reach", label: "Reach" },
      { id: "hookRate", label: "Hook rate" },
    ],
    series: moneySeries(period, earnedIn),
    people,
    funnel: [
      { id: "sent", label: "Sent", count: sent.length },
      { id: "viewed", label: "Viewed", count: viewed.length },
      { id: "shortlisted", label: "Shortlisted", count: shortlisted.length },
      { id: "hired", label: "Hired", count: hired.length },
    ],
    winRate: buildFigure(winSpec, period),
    money: {
      held: earnings.held,
      waitingOnPost: earnings.pending,
      pending: cents(earnings.held + earnings.pending),
      withdrawable: earnings.available,
    },
    rating: { value: creator.rating, count: creator.reviewCount },
  };
}

export type ProductivityReport = BrandReport | CreatorReport;

export function productivityReport(s: DemoState, side: ProductivitySide, range: RangeId): ProductivityReport {
  return (side === "creator" ? creatorReport(s, range) : undefined) ?? brandReport(s, range);
}

/**
 * The chip beside "Productivity" in the account menu: the hero figure of the account's default side
 * (spend for a brand, earnings for a creator; never CAC) against the previous 30 days. Null when
 * there's no change to show.
 */
export function productivityChip(s: DemoState): { figure: Figure; delta: Delta } | null {
  const hero = productivityReport(s, defaultSide(s), DEFAULT_RANGE).kpis[0];
  return hero.delta ? { figure: hero, delta: hero.delta } : null;
}

/* -------------------------------------------------------------------------- */
/* Export                                                                      */
/* -------------------------------------------------------------------------- */

const pctCell = (rate: Rate) => (rate.of ? `${rate.hit} of ${rate.of}` : "");
const ratingCell = (value: number | null) => (value === null ? "" : value.toFixed(1));

/** The tables on screen as CSV rows (money as plain numbers in US dollars). Build the file with `toCsv`. */
export function productivityCsvRows(report: ProductivityReport): (string | number)[][] {
  const { period } = report;
  const who = report.side === "brand" ? report.business.name : `${report.creator.name} (@${report.creator.handle})`;
  const figureRows = (figures: Figure[]) =>
    figures.map((f) => [f.label, f.display, f.previousDisplay, f.delta?.text ?? "", f.basis]);
  const rows: (string | number)[][] = [
    ["Yapp Productivity"],
    ["View", report.side === "brand" ? "As a brand" : "As a creator"],
    ["Account", who],
    ["Period", period.label, period.span],
    ["Compared with", period.compareLabel, period.prevSpan],
    [],
    ["Figure", "This period", "Previous period", "Change", "Based on"],
    ...figureRows(report.kpis),
    ...report.adMetrics.map((m) => [m.label, "", "", "", AD_ACCOUNT_LINE]),
    [],
  ];
  if (report.side === "brand") {
    rows.push(
      ["Creators you worked with"],
      ["Creator", "Handle", "Orders", "Videos approved", "On time", "Approved on first version", "Changes asked", "Spend (USD)", "Your rating"],
      ...report.people.map((p) => [
        p.creator.name,
        `@${p.creator.handle}`,
        p.orders,
        p.videos,
        pctCell(p.onTime),
        pctCell(p.firstPass),
        p.changes,
        p.spend.toFixed(2),
        ratingCell(p.rating),
      ]),
      [],
      ["How your orders are going"],
      ["Figure", "This period", "Previous period", "Change", "Based on"],
      ...figureRows(report.speed),
      [],
      ["Open work now", "Count"],
      ...report.openWork.map((row) => [row.label, row.count]),
      [],
      ["Held for work in progress (USD)", report.money.held.toFixed(2)],
    );
  } else {
    rows.push(
      ["Brands you worked with"],
      ["Brand", "Orders", "Earned (USD)", "Their review time", "Changes asked", "Rated you", "Repeat client"],
      ...report.people.map((p) => [
        p.business.name,
        p.orders,
        p.earned.toFixed(2),
        formatFigure(p.reviewHours, "hours").replace("—", ""),
        p.changes,
        ratingCell(p.ratedYou),
        p.repeat ? "Yes" : "No",
      ]),
      [],
      ["Pitches sent in this period", "Count"],
      ...report.funnel.map((step) => [step.label, step.count]),
      ["Win rate", report.winRate.display, report.winRate.basis],
      [],
      ["Pending (USD)", report.money.pending.toFixed(2)],
      ["Ready to withdraw (USD)", report.money.withdrawable.toFixed(2)],
    );
  }
  return rows;
}

/** "yapp-productivity-brand-30d-2026-11-04.csv" */
export function productivityFileName(report: ProductivityReport): string {
  const day = new Date(NOW + TZ_OFFSET).toISOString().slice(0, 10);
  return `yapp-productivity-${report.side}-${report.period.range}-${day}.csv`;
}
