/**
 * Pure helpers for the creator side: pitch templates, angle ideas, sample ranking, package
 * matching and "what happens next" copy. Safe in render.
 */

import { plural } from "@/lib/format";
import type { DemoState } from "@/lib/store";
import { cityById } from "@/lib/selectors";
import { creatorKindById, formatById, languageById } from "@/lib/taxonomy";
import type {
  Business,
  Commission,
  ContentRequest,
  Creator,
  Package,
  Pitch,
  PitchStatus,
  Product,
  Video,
} from "@/lib/types";

export const MESSAGE_MIN = 80;
export const MESSAGE_MAX = 1500;
export const ANGLE_MIN = 10;
export const ANGLE_MAX = 140;

/* -------------------------------------------------------------------------- */
/* Text helpers                                                                */
/* -------------------------------------------------------------------------- */

const lowerFirst = (text: string) => (text ? text[0].toLowerCase() + text.slice(1) : text);

/** First clause of a sentence: stops at the first comma, colon, full stop or dash. */
function firstClause(text: string, max = 90): string {
  const clause = text.split(/[,:.;—–]\s/)[0]?.trim() ?? text;
  if (clause.length <= max) return clause.replace(/[.,;:]$/, "");
  const cut = clause.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/** Trim to `max` characters on a word boundary. */
function fitLength(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/** "Levantine and Khaleeji", "Saudi, Khaleeji and English" */
export function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/* -------------------------------------------------------------------------- */
/* Packages and pricing                                                        */
/* -------------------------------------------------------------------------- */

/** The creator's cheapest package that covers the brief (video count and length). */
export function matchingPackage(creator: Creator, request: ContentRequest): Package | undefined {
  const sorted = [...creator.packages].sort((a, b) => a.price - b.price);
  return (
    sorted.find(
      (p) => p.videos >= request.brief.videoCount && p.maxSeconds >= request.brief.durationSec,
    ) ??
    sorted.find((p) => p.videos >= request.brief.videoCount) ??
    sorted[sorted.length - 1]
  );
}

export type BudgetFit = "below" | "within" | "above";

export function budgetFit(price: number, request: ContentRequest): BudgetFit {
  if (price < request.budget.min) return "below";
  if (price > request.budget.max) return "above";
  return "within";
}

export function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/* -------------------------------------------------------------------------- */
/* Samples                                                                     */
/* -------------------------------------------------------------------------- */

export type RankedSample = { video: Video; tags: string[]; score: number };

/** Portfolio pieces closest to the brief first: same format, same dialect, same niche. */
export function rankSamples(
  videos: Video[],
  request: ContentRequest,
  product?: Product,
): RankedSample[] {
  return videos
    .map((video, index) => {
      const tags: string[] = [];
      let score = 0;
      if (video.format === request.brief.format) {
        score += 3;
        tags.push("Same format");
      }
      if (request.brief.languages.includes(video.lang)) {
        score += 2;
        tags.push(video.lang === "en" ? "English" : `${languageById[video.lang].short} dialect`);
      }
      if (product && video.niche === product.niche) {
        score += 1;
        tags.push("Same industry");
      }
      return { video, tags, score: score - index * 0.01 };
    })
    .sort((a, b) => b.score - a.score);
}

/* -------------------------------------------------------------------------- */
/* Angle ideas and message template                                            */
/* -------------------------------------------------------------------------- */

/** Three one-line hook ideas derived from the brief and product. */
export function angleSuggestions(request: ContentRequest, product?: Product): string[] {
  const brief = request.brief;
  const name = product?.name ?? "the app";
  const feature = product?.features[0] ? lowerFirst(firstClause(product.features[0], 70)) : "the key feature";
  const key = firstClause(brief.keyMessage, 80);
  const problem = product?.problem
    ? lowerFirst(firstClause(product.problem.replace(/^They /, "You "), 80))
    : "the everyday problem it fixes";

  const formatLed: Record<string, string> = {
    "selfie-demo": `Talk to camera like a friend, then show ${name} on my phone: ${feature}`,
    "screen-walkthrough": `Calm voiceover over a real-speed recording: ${feature}, start to finish`,
    "ugc-review": `"Why I switched to ${name}": a week of real use, told honestly`,
    "problem-skit": `A 20-second skit about the pain, with ${name} saving the day at the end`,
    tutorial: `Follow along with me: ${feature}, every tap on screen`,
    "hook-pack": `Three openings to test (the pain, the result, the surprise) on one shared demo`,
  };

  return [
    `Open on the moment everyone knows: ${problem}`,
    `Say "${key}" straight to camera, then prove it in one take`,
    formatLed[brief.format] ?? `Show ${name} in action within the first 5 seconds`,
  ].map((idea) => fitLength(idea, ANGLE_MAX));
}

export function pitchTemplate(input: {
  creator: Creator;
  request: ContentRequest;
  business?: Business;
  product?: Product;
  angle: string;
  days: number;
  pkg?: Package;
  sampleCount: number;
}): string {
  const { creator, request, business, product, angle, days, pkg, sampleCount } = input;
  const brief = request.brief;
  const format = formatById[brief.format].name.toLowerCase();
  const city = cityById(creator.cityId)?.name ?? "the Gulf";
  const kind = creatorKindById[creator.kind].name.toLowerCase();
  const article = /^[aeiou]/.test(kind) ? "an" : "a";
  const myLangs = creator.languages.filter((l) => brief.languages.includes(l));
  const dialects = joinWords(
    (myLangs.length ? myLangs : brief.languages).map((l) => languageById[l].short),
  );
  const audience = lowerFirst(firstClause(brief.audience, 110));
  const tone = product?.tone.length ? joinWords(product.tone.map((t) => t.toLowerCase())) : "natural";
  const productName = product?.name ?? business?.name ?? "your product";
  const cta = product?.cta ?? "try it today";
  const idea = angle.trim() ? lowerFirst(angle.trim().replace(/\.$/, "")) : "open on the problem, show the app fast, and close on the call to action";
  const revisions = pkg ? `, with ${plural(pkg.revisions, "round")} of changes included` : "";

  return [
    `Hi ${business?.name ?? "there"} team,`,
    `I'm ${creator.firstName}, ${article} ${kind} in ${city}. I make ${format}s in ${dialects}, and ${productName} is exactly the kind of product I love explaining.`,
    `My idea: ${idea}. I'd speak to ${audience}, keep it ${tone}, and finish on "${cta}".`,
    `${sampleCount ? `The ${plural(sampleCount, "sample")} attached ${sampleCount === 1 ? "is" : "are"} closest to this brief. ` : ""}I can deliver ${plural(brief.videoCount, "video")} in ${plural(days, "day")}${revisions}.`,
    `${creator.firstName}`,
  ].join("\n\n");
}


/* -------------------------------------------------------------------------- */
/* Pitch status copy                                                           */
/* -------------------------------------------------------------------------- */

/** Rough reply expectation from the business's track record (shown after sending). */
export function replyWindow(business?: Business): string {
  if (!business) return "within 2 days";
  return business.clientRating >= 4.7 || business.hires >= 10 ? "within a day" : "within 2 days";
}

export function pitchNextStep(status: PitchStatus, businessName: string): string {
  switch (status) {
    case "sent":
      return `${businessName} hasn't opened it yet. We'll let you know the moment they do.`;
    case "viewed":
      return `${businessName} has read your pitch. You'll hear here if you make the shortlist.`;
    case "shortlisted":
      return `You're on ${businessName}'s shortlist. Keep an eye on messages: they may ask a question before hiring.`;
    case "hired":
      return "You're hired and payment is secured. Head to the commission to get started.";
    case "declined":
      return `${businessName} went with another creator this time. Your pitch stays private.`;
    case "withdrawn":
    default:
      return "You withdrew this pitch. You can pitch again while the request is open.";
  }
}

/** The commission created from this pitch (hired pitches only). */
export function commissionForPitch(s: DemoState, pitch: Pitch): Commission | undefined {
  return (
    s.commissions.find((c) => c.pitchId === pitch.id) ??
    s.commissions.find(
      (c) => c.requestId === pitch.requestId && c.creatorId === pitch.creatorId && c.source === "request",
    )
  );
}

/** Pitch funnel numbers. "Viewed" counts every pitch the business opened. */
export function pitchFunnel(pitches: Pitch[]) {
  const live = pitches.filter((p) => p.status !== "withdrawn");
  const viewed = live.filter((p) => p.status !== "sent").length;
  const shortlisted = live.filter((p) => p.status === "shortlisted" || p.status === "hired").length;
  const hired = live.filter((p) => p.status === "hired").length;
  const decided = live.filter((p) => p.status === "hired" || p.status === "declined").length;
  return {
    sent: live.length,
    viewed,
    shortlisted,
    hired,
    viewRate: live.length ? Math.round((viewed / live.length) * 100) : 0,
    hireRate: live.length ? Math.round((hired / live.length) * 100) : 0,
    decided,
  };
}
