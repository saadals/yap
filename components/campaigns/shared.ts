/**
 * Pure helpers for the campaign UI (wizard and order page). No React, no store writes.
 */

import { compact, money, plural } from "@/lib/format";
import { type IneligibleReason, withCampaignFee } from "@/lib/campaigns";
import {
  CAMPAIGN_DEADLINE_DEFAULT,
  CAMPAIGN_DEADLINE_OPTIONS,
  CAMPAIGN_KEEP_LIVE_DAYS,
  CAMPAIGN_MAX_VIDEOS,
  CAMPAIGN_MIN_VIDEOS,
  campaignPlatformById,
  tierById,
} from "@/lib/taxonomy";
import type {
  CampaignPlatformId,
  CampaignTerms,
  ContentRequest,
  Creator,
  FollowerTierId,
  LanguageId,
  Product,
} from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Wizard form                                                                 */
/* -------------------------------------------------------------------------- */

export type Explainer = {
  name: string;
  durationSec: number;
  /** Where it came from: a simulated upload or one of the product's footage files. */
  source: "upload" | "asset";
  assetId?: string;
};

export type CampaignForm = {
  productId: string;
  /** No saved products yet: a name and one line, saved as a product when publishing. */
  quickName: string;
  quickLine: string;
  title: string;
  keyMessage: string;
  explainer?: Explainer;
  brandHandle: string;
  platform: CampaignPlatformId;
  mustInclude: string[];
  avoid: string[];
  languages: LanguageId[];
  videos: number;
  /** Days a creator has to upload version 1 after taking a slot. */
  deadlineDays: number;
  tierId: FollowerTierId;
  paymentMethodId: string;
};

export const STEPS = [
  { key: "product", label: "Product" },
  { key: "say", label: "What to say" },
  { key: "videos", label: "Videos" },
  { key: "tier", label: "Follower tier" },
  { key: "pay", label: "Review and pay" },
] as const;

export type FieldKey =
  | "product"
  | "quickName"
  | "quickLine"
  | "title"
  | "keyMessage"
  | "brandHandle"
  | "mustInclude"
  | "videos"
  | "tierId"
  | "paymentMethodId";

export type Errors = Partial<Record<FieldKey, string>>;

/** "@daftar.app" → "daftar.app"; keeps letters, digits, dots and underscores. */
export const bareHandle = (value: string) => value.trim().replace(/^@+/, "");
export const atHandle = (value: string) => (bareHandle(value) ? `@${bareHandle(value)}` : "");
const HANDLE = /^[A-Za-z0-9._]{2,30}$/;

/** Talking points come from the product's features first, then its dos. */
export function talkingPointsFrom(product: Product): string[] {
  return [...product.features.slice(0, 3), ...product.dos.slice(0, 2)].slice(0, 6);
}

/** A first guess at the brand account: "daftar.app" from the website. */
export function handleFromWebsite(website: string): string {
  const host = website
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
  return host && HANDLE.test(host) ? `@${host}` : "";
}

/** Fill the brief from a saved product (only fields the business hasn't typed in yet). */
export function applyProduct(form: CampaignForm, product: Product, previous?: Product): CampaignForm {
  const untouched = (current: string, from?: string) => !current.trim() || current === from;
  const sameList = (a: string[], b?: string[]) => !a.length || (b ? a.join("|") === b.join("|") : false);
  const prevPoints = previous ? talkingPointsFrom(previous) : undefined;
  return {
    ...form,
    productId: product.id,
    title: untouched(form.title, previous ? suggestedTitle(previous) : undefined) ? suggestedTitle(product) : form.title,
    keyMessage: untouched(form.keyMessage, previous?.oneLiner) ? product.oneLiner : form.keyMessage,
    mustInclude: sameList(form.mustInclude, prevPoints) ? talkingPointsFrom(product) : form.mustInclude,
    avoid: sameList(form.avoid, previous?.donts) ? [...product.donts] : form.avoid,
    // A footage file from another product doesn't belong to this one.
    explainer: form.explainer?.source === "asset" ? undefined : form.explainer,
  };
}

export const suggestedTitle = (product: Pick<Product, "name">) => `Your honest take on ${product.name}`;

export function validateStep(step: number, form: CampaignForm, hasProducts: boolean): Errors {
  const errors: Errors = {};
  if (step === 0) {
    if (hasProducts) {
      if (!form.productId) errors.product = "Pick the product this campaign is for.";
    } else {
      if (form.quickName.trim().length < 2) errors.quickName = "Give your product a name.";
      if (form.quickLine.trim().length < 8) errors.quickLine = "Add one line about what it does.";
    }
  }
  if (step === 1) {
    if (form.title.trim().length < 4) errors.title = "Give the campaign a short title creators will see.";
    if (form.keyMessage.trim().length < 8) errors.keyMessage = "Say in a line what it is and what creators should get across.";
    const handle = bareHandle(form.brandHandle);
    if (!handle) errors.brandHandle = "Add the account creators should tag, like @daftar.app.";
    else if (!HANDLE.test(handle)) errors.brandHandle = "Use letters, numbers, dots or underscores only, like @daftar.app.";
    if (!form.mustInclude.some((x) => x.trim())) errors.mustInclude = "Add at least one talking point.";
  }
  if (step === 2) {
    if (form.videos < CAMPAIGN_MIN_VIDEOS || form.videos > CAMPAIGN_MAX_VIDEOS)
      errors.videos = `Pick between ${CAMPAIGN_MIN_VIDEOS} and ${CAMPAIGN_MAX_VIDEOS} videos.`;
  }
  if (step === 3) {
    if (!tierById[form.tierId]) errors.tierId = "Pick a follower tier.";
  }
  if (step === 4) {
    if (!form.paymentMethodId) errors.paymentMethodId = "Pick a card to hold the budget on, or add one.";
  }
  return errors;
}

export function firstInvalidStep(form: CampaignForm, hasProducts: boolean): number {
  return STEPS.findIndex((_, index) => Object.keys(validateStep(index, form, hasProducts)).length > 0);
}

/** The budget: videos × price (to creators), the service fee on it, and the total charged and held. */
export const budgetFor = (form: Pick<CampaignForm, "videos" | "tierId">) =>
  withCampaignFee(form.videos * tierById[form.tierId].pricePerVideo);

/** What publishing charges and holds, fee included. */
export const totalFor = (form: Pick<CampaignForm, "videos" | "tierId">) => budgetFor(form).total;

/** A deadline from the allowed options (an earlier campaign's, or the default). */
export const deadlineOrDefault = (days?: number) =>
  CAMPAIGN_DEADLINE_OPTIONS.find((d) => d === days) ?? CAMPAIGN_DEADLINE_DEFAULT;

/* -------------------------------------------------------------------------- */
/* Copy                                                                        */
/* -------------------------------------------------------------------------- */

/** "paid partnership label" / "paid partnership tag" */
export const disclosureName = (platform: CampaignPlatformId) =>
  campaignPlatformById[platform].disclosure.split(" (")[0].toLowerCase();

/** The posting rule creators agree to. */
export const postingRule = (terms: Pick<CampaignTerms, "platform" | "brandHandle">) =>
  `Post it on your ${campaignPlatformById[terms.platform].name}, tag ${terms.brandHandle}, turn on the ${disclosureName(terms.platform)}, and keep it up for ${CAMPAIGN_KEEP_LIVE_DAYS} days.`;

/** "Upload within 5 days of taking a slot, set by Daftar" */
export const deadlineLine = (terms: Pick<CampaignTerms, "deadlineDays">, brandName?: string) =>
  `Upload within ${plural(terms.deadlineDays, "day")} of taking a slot${brandName ? `, set by ${brandName}` : ""}`;

/** "10K–20K verified real followers on TikTok" */
export const requirementLine = (terms: Pick<CampaignTerms, "tierId" | "platform">) =>
  `${tierById[terms.tierId].label} verified real followers on ${campaignPlatformById[terms.platform].name}`;

export const perYapp = (price: number) => `${money(price)} per Yapp`;

/**
 * "Only 3 Yapps left · take one now" or "7 of 10 slots open". Pass `urge: false` when the viewer
 * can't take one (no "take one now" nudge).
 */
export function seatsLine(open: number, total: number, urge = true): string {
  if (open <= 0) return `All ${total} slots taken`;
  if (open <= 3) return `Only ${open} ${open === 1 ? "Yapp" : "Yapps"} left${urge ? " · take one now" : ""}`;
  return `${open} of ${total} slots open`;
}

/** A creator's verified followers on the campaign's platform: "14.2K on TikTok". */
export function followersOn(creator: Creator, platform: CampaignPlatformId) {
  const social = creator.socials?.find((a) => a.platform === platform);
  if (!social) return { text: `No ${campaignPlatformById[platform].name} connected`, verified: false };
  return {
    text: `${compact(social.followers)} on ${campaignPlatformById[platform].name}`,
    verified: social.verified,
  };
}

/** Why this account can't take a slot, in plain words. */
export function ineligibleCopy(
  reason: IneligibleReason,
  request: ContentRequest,
  followers?: number,
): { title: string; body?: string } {
  const terms = request.campaign;
  const platform = terms ? campaignPlatformById[terms.platform].name : "the platform";
  const tier = terms ? tierById[terms.tierId].label : "";
  switch (reason) {
    case "own":
      return { title: "This is your own campaign", body: "You can't take a slot on a campaign you placed." };
    case "closed":
      return { title: "This campaign is closed", body: "It isn't taking creators any more." };
    case "full":
      return { title: "All slots are taken", body: "If a slot reopens, it goes to the first eligible creator who takes it." };
    case "joined":
      return { title: "You already have a slot" };
    case "excluded":
      return { title: "You can't take a slot on this campaign again" };
    case "no_profile":
      return { title: "Set up a creator profile to take a slot", body: "It takes a minute. Then connect your account so we can check your followers." };
    case "no_account":
      return { title: `Connect your ${platform} account to check your followers`, body: "It's read-only. We only count real, verified followers." };
    case "unverified":
      return { title: "We're still verifying your followers", body: "This usually takes a few minutes. Check back soon." };
    case "below":
    case "above":
      return {
        title: `This campaign is for creators with ${tier} real followers on ${platform}.`,
        body: followers !== undefined ? `You have ${compact(followers)}.` : undefined,
      };
  }
}
