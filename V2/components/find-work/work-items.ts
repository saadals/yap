/**
 * Find work's data: open custom requests and UGC campaigns as one list of items, with fit (in the
 * creator's own voice), eligibility, the viewer's state on each, filters and sorting. Pure, safe in
 * render. Studio Today uses the same list for "Work that fits you".
 */

import {
  businessById,
  fit as fitFor,
  isCampaign,
  me,
  openCampaigns,
  opportunities,
  pitchesForRequest,
  type Eligibility,
  type Fit,
} from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { formatById, languageById, pitchStatus, type Tone } from "@/lib/taxonomy";
import { lengthLabel, moneyRange, plural, shortDate } from "@/lib/format";
import type { Business, Commission, ContentRequest, FormatId, LanguageId, Pitch } from "@/lib/types";

import { eligibilityLine, perVideo, type EligibilityLine } from "@/components/opportunity/campaign-copy";

export type WorkKind = "custom" | "campaign";
export type WorkSort = "fit" | "newest" | "pay" | "due";

export const SORTS: { value: WorkSort; label: string }[] = [
  { value: "fit", label: "Best fit" },
  { value: "newest", label: "Newest" },
  { value: "pay", label: "Highest pay" },
  { value: "due", label: "Due soonest" },
];

export const MIN_PAY_STEPS = [0, 100, 200, 300, 500];

export type WorkItem = {
  id: string;
  kind: WorkKind;
  request: ContentRequest;
  business?: Business;
  /** Custom requests, with a creator profile: how well you fit (in your voice). */
  fit?: Fit;
  invited: boolean;
  pitch?: Pitch;
  pitchCount: number;
  /** Campaigns only. */
  eligibility?: Eligibility;
  eligibilityText?: EligibilityLine;
  openSlots?: number;
  slot?: Commission;
  hidden: boolean;
  /** What it pays: a custom request's top budget, a campaign's price per video. */
  pay: number;
  /** A custom request's due date, a campaign's closing date. */
  deadline: string;
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

export const voiced = (fit: Fit): Fit => ({
  score: fit.score,
  reasons: fit.reasons.map(creatorVoice),
  gaps: fit.gaps.map(creatorVoice),
});

/* -------------------------------------------------------------------------- */
/* Items                                                                       */
/* -------------------------------------------------------------------------- */

/** Open custom requests and campaigns for the signed-in account (with or without a creator profile). */
export function workItems(s: DemoState): WorkItem[] {
  const creator = me.creator(s);
  const { businessId } = me.ids(s);
  const hidden = me.hiddenRequestIds(s);

  const custom: WorkItem[] = creator
    ? opportunities(s).map((o) => {
        const fit = voiced(o.fit);
        const acted = Boolean(o.pitch);
        return {
          id: o.request.id,
          kind: "custom" as const,
          request: o.request,
          business: businessById(s, o.request.businessId),
          fit,
          invited: o.invited,
          pitch: o.pitch,
          pitchCount: o.pitchCount,
          hidden: o.hidden,
          pay: o.request.budget.max,
          deadline: o.request.dueDate,
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
          request,
          business: businessById(s, request.businessId),
          invited: false,
          pitchCount: pitchesForRequest(s, request.id).length,
          hidden: hidden.includes(request.id),
          pay: request.budget.max,
          deadline: request.dueDate,
          score: 0,
        }));

  const campaigns: WorkItem[] = openCampaigns(s)
    .filter(({ eligibility, slot, request, openSlots }) => {
      if (slot) return true;
      if (!eligibility.ok && (eligibility.reason === "own" || eligibility.reason === "excluded")) return false;
      return request.status === "open" && openSlots > 0;
    })
    .map(({ request, eligibility, openSlots, slot, hidden: isHidden }) => {
      const base = creator ? fitFor(s, creator, request).score : 0;
      const penalty = slot ? 200 : eligibility.ok ? 0 : 40;
      return {
        id: request.id,
        kind: "campaign" as const,
        request,
        business: businessById(s, request.businessId),
        invited: false,
        pitchCount: 0,
        eligibility,
        eligibilityText: eligibilityLine(eligibility, request),
        openSlots,
        slot,
        hidden: isHidden,
        pay: request.campaign?.pricePerVideo ?? request.budget.max,
        deadline: request.campaign?.closesAt ?? request.dueDate,
        score: base - penalty,
      };
    });

  return [...custom, ...campaigns];
}

export type WorkFilters = {
  kind?: WorkKind;
  format?: FormatId;
  lang?: LanguageId;
  min: number;
  sort: WorkSort;
  showHidden: boolean;
};

export function matches(item: WorkItem, f: Omit<WorkFilters, "sort" | "kind" | "showHidden">) {
  if (f.format && item.request.brief.format !== f.format) return false;
  if (f.lang && !item.request.brief.languages.includes(f.lang)) return false;
  if (f.min && item.pay < f.min) return false;
  return true;
}

export function sortItems(items: WorkItem[], sort: WorkSort): WorkItem[] {
  const byNewest = (a: WorkItem, b: WorkItem) => Date.parse(b.request.postedAt) - Date.parse(a.request.postedAt);
  return [...items].sort((a, b) => {
    if (sort === "fit") return b.score - a.score || byNewest(a, b);
    if (sort === "pay") return b.pay - a.pay || byNewest(a, b);
    if (sort === "due") return Date.parse(a.deadline) - Date.parse(b.deadline) || byNewest(a, b);
    return byNewest(a, b);
  });
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                      */
/* -------------------------------------------------------------------------- */

/** "2 videos × 45s" / "45s" */
export const deliverables = (r: ContentRequest) =>
  r.brief.videoCount > 1 ? `${r.brief.videoCount} videos × ${lengthLabel(r.brief.durationSec)}` : lengthLabel(r.brief.durationSec);

/** "App demo · English · 2 videos × 45s" */
export function metaLine(item: Pick<WorkItem, "kind" | "request">): string {
  const r = item.request;
  const langs = r.brief.languages.map((l) => languageById[l].name).join(" or ");
  if (item.kind === "campaign") return ["UGC campaign", langs, lengthLabel(r.brief.durationSec)].join(" · ");
  return [formatById[r.brief.format].name, langs, deliverables(r)].join(" · ");
}

/** "$200–350" / "$30 per video" */
export const payLabel = (item: Pick<WorkItem, "kind" | "request">) =>
  item.kind === "campaign" ? perVideo(item.request.campaign?.pricePerVideo ?? item.request.budget.max) : moneyRange(item.request.budget.min, item.request.budget.max);

/** "Due Nov 16" / "Closes Nov 18" */
export const deadlineLabel = (item: Pick<WorkItem, "kind" | "deadline">) =>
  `${item.kind === "campaign" ? "Closes" : "Due"} ${shortDate(item.deadline)}`;

/** The viewer's own state on an item, as a short label with a chip tone (or undefined). */
export function myState(item: WorkItem): { label: string; tone: Tone } | undefined {
  if (item.slot) {
    const c = item.slot;
    if (c.status === "in_progress" || c.status === "revision")
      return { label: `Your slot · due ${shortDate(c.dueDate)}`, tone: c.status === "revision" ? "warning" : "active" };
    if (c.status === "delivered") return { label: "Your slot · in review", tone: "neutral" };
    return { label: "Your slot", tone: "success" };
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

/** "12 requests and 4 campaigns" (open, and not yet pitched on or joined) */
export function openSummary(items: WorkItem[]): string {
  const custom = items.filter((i) => i.kind === "custom" && !i.pitch).length;
  const campaigns = items.filter((i) => i.kind === "campaign" && !i.slot).length;
  return `${plural(custom, "request")} and ${plural(campaigns, "campaign")}`;
}

/** The single top reason a row shows ("92% fit · You speak English"). */
export function fitLine(item: WorkItem): string | undefined {
  if (!item.fit) return undefined;
  // The most telling reason first: matching work in the portfolio, then the category.
  const top =
    item.fit.reasons.find((r) => r.includes("in your portfolio")) ??
    item.fit.reasons.find((r) => r.startsWith("You work with")) ??
    item.fit.reasons[0] ??
    item.fit.gaps[0];
  return top ? `${item.fit.score}% fit · ${top}` : `${item.fit.score}% fit`;
}

