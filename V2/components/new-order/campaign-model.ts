/**
 * The UGC campaign flow: its form, prefill (fresh, from a product, or "run again" from an earlier
 * campaign), validation per step and the money. Pure; safe in render. Rules follow V1's campaign
 * wizard (components/campaigns/shared.ts) and the legal pack's numbers in lib/taxonomy.tsx.
 */

import { withCampaignFee } from "@/lib/campaigns";
import { NOW_ISO, addDays } from "@/lib/clock";
import { me } from "@/lib/selectors";
import type { CampaignInput, DemoState } from "@/lib/store";
import {
  CAMPAIGN_DEADLINE_DEFAULT,
  CAMPAIGN_DEADLINE_OPTIONS,
  CAMPAIGN_MAX_VIDEOS,
  CAMPAIGN_MIN_VIDEOS,
  CAMPAIGN_OPEN_DAYS,
  campaignPlatformById,
  tierById,
} from "@/lib/taxonomy";
import type { CampaignPlatformId, FollowerTierId, LanguageId, Product } from "@/lib/types";

export type Explainer = {
  name: string;
  durationSec: number;
  /** A simulated upload, or one of the product's footage files. */
  source: "upload" | "asset";
  assetId?: string;
};

export type CampaignForm = {
  productId: string;
  title: string;
  keyMessage: string;
  /** Talking points (the brief's must-include). */
  mustInclude: string[];
  /** Restrictions (the brief's avoid). */
  avoid: string[];
  explainer?: Explainer;
  languages: LanguageId[];
  platform: CampaignPlatformId;
  tierId: FollowerTierId;
  videos: number;
  brandHandle: string;
  /** Days a creator has to upload version 1 after taking a slot. */
  deadlineDays: number;
  paymentMethodId: string;
};

export const STEPS = [
  { key: "say", label: "What to say", title: "What should creators say?", lead: "Every creator gets the same brief and makes their own take on it." },
  {
    key: "creators",
    label: "Creators and price",
    title: "Who makes them, and at what price?",
    lead: "Creators post on their own accounts. Their follower tier sets the price per video.",
  },
  { key: "rules", label: "Rules", title: "The rules creators agree to", lead: undefined },
  { key: "pay", label: "Review and pay", title: "Review and publish", lead: "The budget is held now and paid out video by video." },
] as const;

export type FieldKey = "product" | "title" | "keyMessage" | "mustInclude" | "tierId" | "videos" | "brandHandle" | "deadline" | "payment";

export const stepOfField: Record<FieldKey, number> = {
  product: 0,
  title: 0,
  keyMessage: 0,
  mustInclude: 0,
  tierId: 1,
  videos: 1,
  brandHandle: 1,
  deadline: 2,
  payment: 3,
};

const HANDLE = /^[A-Za-z0-9._]{2,30}$/;
/** "@daftar.app" → "daftar.app". */
export const bareHandle = (value: string) => value.trim().replace(/^@+/, "");
export const atHandle = (value: string) => (bareHandle(value) ? `@${bareHandle(value)}` : "");

/** Talking points come from the product's features first, then its dos. */
export const talkingPointsFrom = (product: Product) =>
  [...product.features.slice(0, 3), ...product.dos.slice(0, 2)].slice(0, 6);

export const suggestedTitle = (product: Pick<Product, "name">) => `Your honest take on ${product.name}`;

/** A first guess at the brand account from the website ("daftar.app" → "@daftar.app"). */
export function handleFromWebsite(website: string): string {
  const host = website.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  return host && HANDLE.test(host) ? `@${host}` : "";
}

/** Fill the brief from a saved product (only what the business hasn't typed yet). */
export function applyProduct(form: CampaignForm, product: Product, previous?: Product): CampaignForm {
  const untouched = (current: string, from?: string) => !current.trim() || current === from;
  const sameList = (a: string[], b?: string[]) => !a.length || (b ? a.join("|") === b.join("|") : false);
  return {
    ...form,
    productId: product.id,
    title: untouched(form.title, previous ? suggestedTitle(previous) : undefined) ? suggestedTitle(product) : form.title,
    keyMessage: untouched(form.keyMessage, previous?.oneLiner) ? product.oneLiner : form.keyMessage,
    mustInclude: sameList(form.mustInclude, previous ? talkingPointsFrom(previous) : undefined)
      ? talkingPointsFrom(product)
      : form.mustInclude,
    avoid: sameList(form.avoid, previous?.donts) ? [...product.donts] : form.avoid,
    // A footage file from another product doesn't belong to this one.
    explainer: form.explainer?.source === "asset" ? undefined : form.explainer,
  };
}

export const deadlineOrDefault = (days?: number) =>
  CAMPAIGN_DEADLINE_OPTIONS.find((d) => d === days) ?? CAMPAIGN_DEADLINE_DEFAULT;

export type CampaignInit = { form: CampaignForm; step: number; maxStep: number; again?: string };

/**
 * Start fresh (carrying the brand account and languages over from this account's last campaign),
 * from `?product=`, or from an earlier campaign (`?again=` a campaign id, or one of its slots).
 */
export function initialCampaign(s: DemoState, productParam: string, againParam: string): CampaignInit {
  const business = me.business(s);
  const products = s.products.filter((p) => p.businessId === business.id);
  const methods = me.paymentMethods(s);
  const defaultMethod = (methods.find((m) => m.isDefault) ?? methods[0])?.id ?? "";

  const slot = s.commissions.find((c) => c.id === againParam && c.source === "campaign");
  const againId = slot?.requestId ?? againParam;
  const again = s.requests.find((r) => r.id === againId && r.businessId === business.id && r.campaign);
  if (again?.campaign) {
    const terms = again.campaign;
    const tier = tierById[terms.tierId];
    const form: CampaignForm = {
      productId: products.some((p) => p.id === again.brief.productId) ? again.brief.productId : "",
      title: again.title,
      keyMessage: again.brief.keyMessage,
      mustInclude: [...again.brief.mustInclude],
      avoid: [...again.brief.avoid],
      explainer: terms.explainer ? { name: terms.explainer.name, durationSec: terms.explainer.durationSec, source: "upload" } : undefined,
      languages: [...again.brief.languages],
      platform: terms.platform,
      tierId: tier && !tier.placeholder ? terms.tierId : "t10",
      videos: Math.min(CAMPAIGN_MAX_VIDEOS, Math.max(CAMPAIGN_MIN_VIDEOS, again.slots)),
      brandHandle: terms.brandHandle,
      deadlineDays: deadlineOrDefault(terms.deadlineDays),
      paymentMethodId: methods.some((m) => m.id === terms.paymentMethodId) ? terms.paymentMethodId : defaultMethod,
    };
    return { form, step: 0, maxStep: STEPS.length - 1, again: again.title };
  }

  const fromParam = products.find((p) => p.id === productParam);
  const product = fromParam ?? (products.length === 1 ? products[0] : undefined);
  const previous = s.requests
    .filter((r) => r.businessId === business.id && r.campaign)
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))[0];
  const base: CampaignForm = {
    productId: "",
    title: "",
    keyMessage: "",
    mustInclude: [],
    avoid: [],
    explainer: undefined,
    languages: previous?.brief.languages.length ? [...previous.brief.languages] : ["en"],
    platform: previous?.campaign?.platform ?? "tiktok",
    tierId: "t10",
    videos: CAMPAIGN_MIN_VIDEOS,
    brandHandle: previous?.campaign?.brandHandle ?? handleFromWebsite(business.website),
    deadlineDays: deadlineOrDefault(previous?.campaign?.deadlineDays),
    paymentMethodId: defaultMethod,
  };
  return { form: product ? applyProduct(base, product) : base, step: 0, maxStep: 0 };
}

export function validateStep(step: number, form: CampaignForm, hasProduct: boolean, methodIds: string[]) {
  const errors: Partial<Record<FieldKey, string>> = {};
  if (step === 0) {
    if (!hasProduct) errors.product = "Pick the product this campaign is for, or add one.";
    if (form.title.trim().length < 4) errors.title = "Give the campaign a short title creators will see.";
    if (form.keyMessage.trim().length < 8) errors.keyMessage = "Say in a line what it is and what creators should get across.";
    if (!form.mustInclude.some((x) => x.trim())) errors.mustInclude = "Add at least one talking point.";
  }
  if (step === 1) {
    const tier = tierById[form.tierId];
    if (!tier || tier.placeholder) errors.tierId = "Pick a follower tier with a price.";
    if (form.videos < CAMPAIGN_MIN_VIDEOS || form.videos > CAMPAIGN_MAX_VIDEOS)
      errors.videos = `Pick between ${CAMPAIGN_MIN_VIDEOS} and ${CAMPAIGN_MAX_VIDEOS} videos.`;
    const handle = bareHandle(form.brandHandle);
    if (!handle) errors.brandHandle = "Add the account creators should tag, like @daftar.app.";
    else if (!HANDLE.test(handle)) errors.brandHandle = "Use letters, numbers, dots or underscores only, like @daftar.app.";
  }
  if (step === 2 && !CAMPAIGN_DEADLINE_OPTIONS.some((d) => d === form.deadlineDays))
    errors.deadline = "Pick how long creators have to upload.";
  if (step === 3 && !methodIds.includes(form.paymentMethodId)) errors.payment = "Pick a card to hold the budget on, or add one.";
  return errors;
}

export function firstInvalidStep(form: CampaignForm, hasProduct: boolean, methodIds: string[]) {
  return STEPS.findIndex((_, i) => Object.keys(validateStep(i, form, hasProduct, methodIds)).length > 0);
}

/** Videos × price (to creators), the 10% fee on it, and the total charged and held now. */
export const budgetFor = (form: Pick<CampaignForm, "videos" | "tierId">) =>
  withCampaignFee(form.videos * tierById[form.tierId].pricePerVideo);

/** When a campaign published now stops taking creators. */
export const closesAtIfNow = () => addDays(NOW_ISO, CAMPAIGN_OPEN_DAYS);

/** "paid partnership label" / "paid partnership tag" */
export const disclosureName = (platform: CampaignPlatformId) =>
  campaignPlatformById[platform].disclosure.split(" (")[0].toLowerCase();

export function toCampaignInput(form: CampaignForm, product: Product): CampaignInput {
  return {
    title: form.title.trim(),
    productId: product.id,
    brief: {
      keyMessage: form.keyMessage.trim(),
      mustInclude: form.mustInclude.map((x) => x.trim()).filter(Boolean),
      avoid: form.avoid.map((x) => x.trim()).filter(Boolean),
      languages: form.languages.length ? form.languages : undefined,
      audience: product.audience || undefined,
    },
    videos: form.videos,
    tierId: form.tierId,
    deadlineDays: form.deadlineDays,
    platform: form.platform,
    brandHandle: atHandle(form.brandHandle),
    explainer: form.explainer ? { name: form.explainer.name, durationSec: form.explainer.durationSec } : undefined,
    paymentMethodId: form.paymentMethodId,
  };
}
