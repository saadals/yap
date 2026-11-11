/**
 * Find work's data: open custom orders and UGC campaigns as one list of items, with fit (in the
 * creator's own voice), eligibility across a campaign's platforms, the viewer's state on each,
 * filters and sorting. Pure, safe in render. Studio Today uses the same list for "Work that fits
 * you". Prices are listed prices (what the brand pays); creators always see their net beside them.
 */

import {
  businessById,
  fit as fitFor,
  isCampaign,
  jobTypeOf,
  me,
  openCampaigns,
  opportunities,
  pitchesForRequest,
  reliabilitySummary,
  type Eligibility,
  type Fit,
} from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { campaignPlatformById, formatById, jobTypeById, languageById, orderKinds, pitchStatus, type Tone } from "@/lib/taxonomy";
import { lengthLabel, moneyRange, netRange, plural, shortDate } from "@/lib/format";
import type { Business, Commission, ContentRequest, FormatId, JobType, LanguageId, Pitch } from "@/lib/types";

import { eligibilityLine, perYapp, yappNet, type EligibilityLine } from "@/components/opportunity/campaign-copy";

export type WorkKind = "custom" | "campaign";
export type WorkSort = "fit" | "newest" | "pay" | "closing";

export const SORTS: { value: WorkSort; label: string }[] = [
  { value: "fit", label: "Best fit" },
  { value: "newest", label: "Newest" },
  { value: "pay", label: "Highest pay" },
  { value: "closing", label: "Closing soonest" },
];

export const MIN_PAY_STEPS = [0, 100, 200, 300, 500];

/** How many custom orders a list marks "Top match". */
const TOP_MATCHES = 3;

export type WorkItem = {
  id: string;
  kind: WorkKind;
  /** Full video or ad copy writing (campaigns are always video). */
  jobType: JobType;
  request: ContentRequest;
  business?: Business;
  /** Custom orders, with a creator profile: how well you fit (in your voice). */
  fit?: Fit;
  /**
   * One of the few custom orders that fit you best (unhidden, not pitched on yet), by the raw fit
   * score. Rows say "Top match" instead of a percentage. Set across the whole list, so a row (and
   * Studio Home's compact rows) can show it without knowing its position.
   */
  topMatch: boolean;
  invited: boolean;
  pitch?: Pitch;
  pitchCount: number;
  /** Campaigns only. */
  eligibility?: Eligibility;
  eligibilityText?: EligibilityLine;
  openSlots?: number;
  slot?: Commission;
  hidden: boolean;
  /** Listed pay: a custom order's top budget, a campaign's price per Yapp. */
  pay: number;
  /** When it stops taking pitches or picks. */
  closesAt: string;
  /** Best-fit order (higher first). */
  score: number;
};

/* -------------------------------------------------------------------------- */
/* Fit in the creator's voice                                                  */
/* -------------------------------------------------------------------------- */

/**
 * `fit()` in lib/selectors is written for the ordering side ("Speaks English", "Within your
 * budget"). Creators read the same reasons about themselves.
 */
export function creatorVoice(text: string): string {
  const rules: [RegExp, string][] = [
    [/^Speaks (.+)$/, "You speak $1"],
    [/^(\d+) (.+) in portfolio$/, "$1 $2 in your portfolio"],
    [/^Offers (.+)$/, "You offer $1"],
    [/^Works with (.+)$/, "You work with $1"],
    [/^Within your budget$/, "Your packages fit their budget"],
    [/^Doesn't list (.+)$/, "You don't list $1"],
    [/^Hasn't listed (.+)$/, "You haven't listed $1"],
    [/^Usually starts at (.+)$/, "Your packages start at $1, above their budget"],
    [/^Booked right now$/, "You're marked as booked"],
  ];
  for (const [pattern, replacement] of rules) if (pattern.test(text)) return text.replace(pattern, replacement);
  return text;
}

/** Package prices are for videos, so they say nothing about an ad-copy budget. */
const PACKAGE_REASON = /^(Within your budget|Usually starts at )/;

export const voiced = (fit: Fit, request?: ContentRequest): Fit => {
  const keep = (text: string) => !(request && jobTypeOf(request) === "ad-copy" && PACKAGE_REASON.test(text));
  return {
    score: fit.score,
    reasons: fit.reasons.filter(keep).map(creatorVoice),
    gaps: fit.gaps.filter(keep).map(creatorVoice),
  };
};

/* -------------------------------------------------------------------------- */
/* Items                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Open custom orders and campaigns for the signed-in account (with or without a creator profile).
 * The account's own orders are never listed, nor invite-only orders it wasn't invited to.
 */
export function workItems(s: DemoState): WorkItem[] {
  const creator = me.creator(s);
  const { businessId } = me.ids(s);
  const hidden = me.hiddenRequestIds(s);

  const custom: WorkItem[] = creator
    ? opportunities(s).map((o) => {
        const fit = voiced(o.fit, o.request);
        const acted = Boolean(o.pitch);
        return {
          id: o.request.id,
          kind: "custom" as const,
          jobType: jobTypeOf(o.request),
          request: o.request,
          business: businessById(s, o.request.businessId),
          fit,
          topMatch: false,
          invited: o.invited,
          pitch: o.pitch,
          pitchCount: o.pitchCount,
          hidden: o.hidden,
          pay: o.request.budget.max,
          closesAt: o.request.closesAt,
          score: fit.score + (o.invited && !acted ? 100 : 0) - (acted ? 200 : 0),
        };
      })
    : s.requests
        .filter(
          (r) => !isCampaign(r) && r.businessId !== businessId && r.status === "open" && r.visibility === "public",
        )
        .map((request) => ({
          id: request.id,
          kind: "custom" as const,
          jobType: jobTypeOf(request),
          request,
          business: businessById(s, request.businessId),
          topMatch: false,
          invited: false,
          pitchCount: pitchesForRequest(s, request.id).length,
          hidden: hidden.includes(request.id),
          pay: request.budget.max,
          closesAt: request.closesAt,
          score: 0,
        }));

  const campaigns: WorkItem[] = openCampaigns(s)
    .filter(({ eligibility, slot, request, openSlots }) => {
      if (slot) return true;
      if (!eligibility.ok && (eligibility.reason === "own" || eligibility.reason === "excluded")) return false;
      return request.status !== "closed" && request.status !== "draft" && openSlots > 0;
    })
    .map(({ request, eligibility, openSlots, slot, hidden: isHidden }) => {
      const base = creator ? fitFor(s, creator, request).score : 0;
      const penalty = slot ? 200 : eligibility.ok ? 0 : 40;
      return {
        id: request.id,
        kind: "campaign" as const,
        jobType: "video" as const,
        request,
        business: businessById(s, request.businessId),
        topMatch: false,
        invited: false,
        pitchCount: 0,
        eligibility,
        eligibilityText: eligibilityLine(eligibility, request),
        openSlots,
        slot,
        hidden: isHidden,
        pay: request.campaign?.pricePerVideo ?? request.budget.max,
        closesAt: request.campaign?.closesAt ?? request.closesAt,
        score: base - penalty,
      };
    });

  // "Top match": the custom orders that fit you best among those you can still act on (not hidden,
  // not pitched on), by the raw fit. The sort score isn't used: it adds the invite bonus. Ties go
  // to the newer order. Only with a creator profile (no fit without one).
  const top = new Set(
    custom
      .filter((i) => i.fit && !i.hidden && !i.pitch)
      .sort(
        (a, b) =>
          (b.fit?.score ?? 0) - (a.fit?.score ?? 0) || Date.parse(b.request.postedAt) - Date.parse(a.request.postedAt),
      )
      .slice(0, TOP_MATCHES)
      .map((i) => i.id),
  );

  return [...custom.map((i) => (top.has(i.id) ? { ...i, topMatch: true } : i)), ...campaigns];
}

export type WorkFilters = {
  kind?: WorkKind;
  job?: JobType;
  format?: FormatId;
  lang?: LanguageId;
  min: number;
  sort: WorkSort;
  showHidden: boolean;
};

export function matches(item: WorkItem, f: Omit<WorkFilters, "sort" | "kind" | "showHidden">) {
  if (f.job && item.jobType !== f.job) return false;
  // Ad copy has no video format, so any format filter leaves it out.
  if (f.format && (item.jobType !== "video" || item.request.brief.format !== f.format)) return false;
  if (f.lang && !item.request.brief.languages.includes(f.lang)) return false;
  if (f.min && item.pay < f.min) return false;
  return true;
}

export function sortItems(items: WorkItem[], sort: WorkSort): WorkItem[] {
  const byNewest = (a: WorkItem, b: WorkItem) => Date.parse(b.request.postedAt) - Date.parse(a.request.postedAt);
  return [...items].sort((a, b) => {
    if (sort === "fit") return b.score - a.score || byNewest(a, b);
    if (sort === "pay") return b.pay - a.pay || byNewest(a, b);
    if (sort === "closing") return Date.parse(a.closesAt) - Date.parse(b.closesAt) || byNewest(a, b);
    return byNewest(a, b);
  });
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                      */
/* -------------------------------------------------------------------------- */

/** "2 videos × 45s" / "45s" / "5 pieces" (ad copy) */
export function deliverables(r: ContentRequest): string {
  if (jobTypeOf(r) === "ad-copy") {
    const pieces = r.brief.copy?.pieces.length ?? 0;
    return pieces ? plural(pieces, "piece") : "Written copy";
  }
  return r.brief.videoCount > 1
    ? `${r.brief.videoCount} videos × ${lengthLabel(r.brief.durationSec)}`
    : lengthLabel(r.brief.durationSec);
}

/**
 * The kind of work in one line:
 *   "UGC campaign · TikTok or Instagram · English · 30s"
 *   "App demo · English · 2 videos × 45s"
 *   "Ad copy writing · English · 4 pieces"
 */
export function metaLine(item: Pick<WorkItem, "kind" | "request" | "jobType">): string {
  const r = item.request;
  const langs = r.brief.languages.map((l) => languageById[l].name).join(" or ");
  if (item.kind === "campaign") {
    const where = (r.campaign?.platforms ?? []).map((p) => campaignPlatformById[p].name).join(" or ");
    return [orderKinds.campaign.name, where, langs, lengthLabel(r.brief.durationSec)].filter(Boolean).join(" · ");
  }
  if (item.jobType === "ad-copy") return [jobTypeById["ad-copy"].name, langs, deliverables(r)].join(" · ");
  return [formatById[r.brief.format].name, langs, deliverables(r)].join(" · ");
}

/** Listed pay: "$200–350" / "$120 a Yapp" */
export const payLabel = (item: Pick<WorkItem, "kind" | "request">) =>
  item.kind === "campaign"
    ? perYapp(item.request.campaign?.pricePerVideo ?? item.request.budget.max)
    : moneyRange(item.request.budget.min, item.request.budget.max);

/** The creator's net beside it: "you earn $160–280" / "you earn $96" */
export const netLabel = (item: Pick<WorkItem, "kind" | "request">) =>
  item.kind === "campaign"
    ? yappNet(item.request.campaign?.pricePerVideo ?? item.request.budget.max)
    : `you earn ${netRange(item.request.budget.min, item.request.budget.max)}`;

/** "Closes Nov 18" */
export const closingLabel = (item: Pick<WorkItem, "closesAt">) => `Closes ${shortDate(item.closesAt)}`;

/**
 * The brand's track record in a few words for a list row ("Pays on time 100% · Reviews in about
 * 9h"): the first two figures of `reliabilitySummary`, or undefined for a brand that's new here.
 */
export function brandRecord(business: Business | undefined): string | undefined {
  const summary = reliabilitySummary(business);
  return summary ? summary.split(" · ").slice(0, 2).join(" · ") : undefined;
}

/** The viewer's own state on an item, as a short label with a chip tone (or undefined). */
export function myState(item: WorkItem): { label: string; tone: Tone } | undefined {
  if (item.slot) {
    const c = item.slot;
    if (c.status === "in_progress" || c.status === "revision")
      return { label: `Your Yapp · due ${shortDate(c.dueDate)}`, tone: c.status === "revision" ? "warning" : "active" };
    if (c.status === "delivered") return { label: "Your Yapp · in review", tone: "neutral" };
    return { label: "Your Yapp", tone: "success" };
  }
  if (item.pitch) {
    const p = item.pitch;
    const label =
      p.status === "sent"
        ? "Pitched"
        : p.status === "viewed"
          ? "Pitched · viewed"
          : pitchStatus[p.status].label;
    return { label, tone: pitchStatus[p.status].tone };
  }
  return undefined;
}

/** "12 custom orders and 4 UGC campaigns" (open, and not yet pitched on or picked) */
export function openSummary(items: WorkItem[]): string {
  const custom = items.filter((i) => i.kind === "custom" && !i.pitch).length;
  const campaigns = items.filter((i) => i.kind === "campaign" && !i.slot).length;
  return `${plural(custom, "custom order")} and ${plural(campaigns, "UGC campaign")}`;
}

/** Said about you, not the order, so it would read the same on every row. */
const BOOKED = creatorVoice("Booked right now");

/**
 * What a row says about fit, if anything: "Top match" on the few that fit you best, otherwise the
 * first thing that's missing ("You haven't listed screen walkthroughs"), otherwise nothing. No
 * percentage and no shared reason: those read the same on nearly every row. The full reasons are
 * on the order's page ("Your fit").
 */
export function fitLine(item: WorkItem): { text: string; top: boolean } | undefined {
  if (!item.fit) return undefined;
  if (item.topMatch) return { text: "Top match", top: true };
  const gap = item.fit.gaps.find((g) => g !== BOOKED);
  return gap ? { text: gap, top: false } : undefined;
}
