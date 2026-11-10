/**
 * Pure helpers for pitching (from V1's components/creator/pitch-helpers.ts): hook ideas, the
 * message template, sample ranking, package matching and "what happens next" copy. Safe in render.
 */

import type { DemoState } from "@/lib/store";
import { plural } from "@/lib/format";
import { cityById, isAdCopy } from "@/lib/selectors";
import { PITCH_MIN, creatorKindById, formatById, languageById } from "@/lib/taxonomy";
import type {
  Business,
  Commission,
  ContentRequest,
  Creator,
  FormatId,
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
export const MAX_SAMPLES = 3;
export const DAY_CHOICES = [3, 5, 7, 10, 14];
/** Ad-copy pitches: a short writing sample, sent at the end of the message. */
export const WRITING_SAMPLE_MAX = 600;
const WRITING_SAMPLE_MARK = "\n\nWriting sample:\n";

/** The message as sent: the pitch, then the writing sample (when there is one) under its own label. */
export function joinWritingSample(message: string, sample: string): string {
  const body = message.trim();
  const extra = sample.trim();
  return extra ? `${body}${WRITING_SAMPLE_MARK}${extra}` : body;
}

/** Back into the composer's two fields when an ad-copy pitch is edited. */
export function splitWritingSample(text: string): { message: string; sample: string } {
  const at = text.indexOf(WRITING_SAMPLE_MARK);
  if (at < 0) return { message: text, sample: "" };
  return { message: text.slice(0, at), sample: text.slice(at + WRITING_SAMPLE_MARK.length) };
}

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

/** "English and Spanish", "English, French and Arabic" */
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
    sorted.find((p) => p.videos >= request.brief.videoCount && p.maxSeconds >= request.brief.durationSec) ??
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

/**
 * A starting price for a new pitch (the listed price, what the brand pays): the matching package,
 * kept inside the brand's budget. Packages are priced for videos, so ad copy starts in the middle
 * of the budget. Never under the $30 pitch floor.
 */
export function suggestedPrice(creator: Creator, request: ContentRequest): number {
  const { min, max } = request.budget;
  const start = isAdCopy(request)
    ? Math.round((min + max) / 2 / 5) * 5
    : Math.min(Math.max(matchingPackage(creator, request)?.price ?? min, min), max);
  return Math.max(PITCH_MIN, start);
}

/* -------------------------------------------------------------------------- */
/* Samples                                                                     */
/* -------------------------------------------------------------------------- */

export type RankedSample = { video: Video; tags: string[]; score: number };

/** Portfolio pieces closest to the brief first: same format, same language, same category. */
export function rankSamples(videos: Video[], request: ContentRequest, product?: Product): RankedSample[] {
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
        tags.push(`In ${languageById[video.lang].name}`);
      }
      if (product && video.niche === product.niche) {
        score += 1;
        tags.push("Same category");
      }
      return { video, tags, score: score - index * 0.01 };
    })
    .sort((a, b) => b.score - a.score);
}

/** The samples a new pitch starts with: up to two close matches. */
export const defaultSamples = (ranked: RankedSample[]) =>
  ranked
    .filter((r) => r.score > 1.5)
    .slice(0, 2)
    .map((r) => r.video.id);

/* -------------------------------------------------------------------------- */
/* Hook ideas and message template                                             */
/* -------------------------------------------------------------------------- */

/** Three one-line hook ideas derived from the brief and product. */
export function angleSuggestions(request: ContentRequest, product?: Product): string[] {
  const brief = request.brief;
  const name = product?.name ?? "the app";
  const feature = product?.features[0] ? lowerFirst(firstClause(product.features[0], 70)) : "the key feature";
  // The key message's first sentence: a clause can be a lone word ("Point, scan, done: …" → "Point").
  const key = fitLength(brief.keyMessage.split(/(?<=[.?])\s/)[0].trim().replace(/[.]$/, ""), 80);
  const problem = product?.problem
    ? lowerFirst(firstClause(product.problem.replace(/^They /, "You "), 80))
    : "the everyday problem it fixes";

  const formatLed: Record<FormatId, string> = {
    "app-demo": `Talk to camera like a friend, then show ${name} on my phone: ${feature}`,
    "screen-walkthrough": `Calm voiceover over a real-speed recording: ${feature}, start to finish`,
    unboxing: `Open it on camera, set it up with the app, and give my honest first take on ${name}`,
    "problem-solution": `Twenty seconds of the pain, then ${name} fixing it on screen`,
    comparison: `${name} next to the way I did it before, same task, side by side`,
    testimonial: `"Why I switched to ${name}": a week of real use, told honestly`,
    "talking-head": `Straight to camera: why ${feature} matters, and how to do it in under a minute`,
    voiceover: `A short story told over ${name} footage, with the product as the turning point`,
    "hook-pack": `Three openings to test (the pain, the result, the surprise) on one shared demo`,
    "ad-copy": `Write it the way ${name}'s customers talk, then cut every line to the platform's limit`,
  };

  if (isAdCopy(request)) {
    return [
      `Lead with the moment everyone knows: ${problem}`,
      `Make “${key}” the headline, and let the body text prove it`,
      formatLed["ad-copy"],
    ].map((idea) => fitLength(idea, ANGLE_MAX));
  }
  return [
    `Open on the moment everyone knows: ${problem}`,
    `Say “${key}” straight to camera, then prove it in one take`,
    formatLed[brief.format],
  ].map((idea) => fitLength(idea, ANGLE_MAX));
}

export function pitchTemplate(input: {
  creator: Creator;
  request: ContentRequest;
  business?: Business;
  product?: Product;
  angle: string;
  days: number;
  /** The package the pitch is based on (kept for callers; two revisions are always included). */
  pkg?: Package;
  sampleCount: number;
}): string {
  const { creator, request, business, product, angle, days, sampleCount } = input;
  const brief = request.brief;
  const adCopy = isAdCopy(request);
  const formatPlural = adCopy ? "ad copy" : formatById[brief.format].noun[1];
  const city = cityById(creator.cityId)?.name;
  const kind = creatorKindById[creator.kind].name.toLowerCase();
  const article = /^[aeiou]/.test(kind) ? "an" : "a";
  const myLangs = creator.languages.filter((l) => brief.languages.includes(l));
  const spoken = joinWords((myLangs.length ? myLangs : brief.languages).map((l) => languageById[l].name));
  const audience = lowerFirst(firstClause(brief.audience, 110));
  const tone = product?.tone.length ? joinWords(product.tone.map((t) => t.toLowerCase())) : "natural";
  const productName = product?.name ?? business?.name ?? "your product";
  const cta = product?.cta ?? "try it today";
  const idea = angle.trim()
    ? lowerFirst(angle.trim().replace(/\.$/, ""))
    : "open on the problem, show the app fast, and close on the call to action";
  // Two revisions are included on every order (round 3 answers, item 8), whatever the package says.
  const revisions = ", with two rounds of changes included";
  const pieces = brief.copy?.pieces.length ?? 0;
  const delivery = adCopy
    ? `I can deliver ${pieces ? `all ${plural(pieces, "piece")}` : "the copy"} in ${plural(days, "day")}${revisions}.`
    : `I can deliver ${plural(brief.videoCount, "video")} in ${plural(days, "day")}${revisions}.`;

  return [
    `Hi ${business?.name ?? "there"} team,`,
    adCopy
      ? `I'm ${creator.firstName}, ${article} ${kind}${city ? ` in ${city}` : ""}. I write ${formatPlural} in ${spoken}, and ${productName} is exactly the kind of product I love explaining.`
      : `I'm ${creator.firstName}, ${article} ${kind}${city ? ` in ${city}` : ""}. I make ${formatPlural} in ${spoken}, and ${productName} is exactly the kind of product I love explaining.`,
    adCopy
      ? `My idea: ${idea}. I'd write for ${audience}, keep it ${tone}, and close on "${cta}".`
      : `My idea: ${idea}. I'd speak to ${audience}, keep it ${tone}, and finish on "${cta}".`,
    `${sampleCount ? `The ${plural(sampleCount, "sample")} attached ${sampleCount === 1 ? "is" : "are"} closest to this brief. ` : ""}${delivery}`,
    `${creator.firstName}`,
  ].join("\n\n");
}

/* -------------------------------------------------------------------------- */
/* Pitch status                                                                */
/* -------------------------------------------------------------------------- */

/** Rough reply expectation from the brand's track record (shown after sending). */
export function replyWindow(business?: Business): string {
  const hours = business?.reliability?.reviewHours;
  if (hours === null || hours === undefined) return "within 2 days";
  return hours <= 24 ? "within a day" : "within 2 days";
}

export function pitchNextStep(status: PitchStatus, businessName: string): string {
  switch (status) {
    case "sent":
      return `${businessName} hasn't opened it yet. We'll tell you the moment they do.`;
    case "viewed":
      return `${businessName} has read your pitch. You'll hear here if you make the shortlist.`;
    case "shortlisted":
      return `You're on ${businessName}'s shortlist. Keep an eye on messages: they may ask a question before hiring.`;
    case "hired":
      return "You're hired and the payment is held for you. Open the job to get started.";
    case "declined":
      return `${businessName} went with another creator this time. Your pitch stays private.`;
    case "withdrawn":
    default:
      return "You withdrew this pitch. You can pitch again while the order is open.";
  }
}

/** Edit while the brand hasn't shortlisted it (V1's rule: sent or viewed, order still open). */
export const canEditPitch = (pitch: Pitch, request: ContentRequest) =>
  request.status === "open" && (pitch.status === "sent" || pitch.status === "viewed");

/** Withdraw while it's still in play (shortlisted too). */
export const canWithdrawPitch = (pitch: Pitch, request: ContentRequest) =>
  request.status === "open" && (pitch.status === "sent" || pitch.status === "viewed" || pitch.status === "shortlisted");

/** The job created from this pitch (hired pitches only). */
export function commissionForPitch(s: DemoState, pitch: Pitch): Commission | undefined {
  return (
    s.commissions.find((c) => c.pitchId === pitch.id) ??
    s.commissions.find(
      (c) => c.requestId === pitch.requestId && c.creatorId === pitch.creatorId && c.source === "request",
    )
  );
}
