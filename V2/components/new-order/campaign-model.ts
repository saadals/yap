/**
 * The UGC campaign flow: its form, prefill (fresh, a saved form draft, from a product, or "run
 * again" from an earlier campaign), validation per step and the money. Pure; safe in render.
 *
 * Round 3 stage 2 rules (lib/taxonomy.tsx, lib/pricing.ts, lib/campaigns.ts): the brand sets the
 * price per Yapp ($30–$5,000) with a guidance range for the category and tier that never blocks;
 * follower tiers only decide who may pick; one or more platforms, each with the brand's handle;
 * the full amount (Yapps × price) is held at posting, nothing on top; creators are paid 7 days
 * after their post is verified, less Yapp's 20%.
 */

import { campaignBudget } from "@/lib/campaigns";
import { NOW_ISO, addDays } from "@/lib/clock";
import { money } from "@/lib/format";
import { priceGuidance, type PriceGuidance } from "@/lib/pricing";
import { me } from "@/lib/selectors";
import type { CampaignInput, DemoState } from "@/lib/store";
import {
  CAMPAIGN_DEADLINE_DEFAULT,
  CAMPAIGN_DEADLINE_OPTIONS,
  CAMPAIGN_MAX_VIDEOS,
  CAMPAIGN_MIN_VIDEOS,
  CAMPAIGN_OPEN_DAYS,
  CAMPAIGN_STEP,
  DEFAULT_LANGUAGE,
  DEFAULT_USAGE,
  PRICE_MAX_PER_YAPP,
  PRICE_MIN_PER_YAPP,
  campaignPlatformById,
  campaignPlatforms,
  tierById,
  usageById,
} from "@/lib/taxonomy";
import type {
  BriefAttachment,
  CampaignPlatformId,
  Creator,
  FollowerTierId,
  LanguageId,
  NicheId,
  Product,
  UsageOptionId,
} from "@/lib/types";

export type Explainer = {
  name: string;
  durationSec: number;
  /** A simulated upload, or one of the product's footage files. */
  source: "upload" | "asset";
  assetId?: string;
};

/** Everything the campaign flow asks. It survives JSON: it is the saved form draft's `data`. */
export type CampaignForm = {
  v: 2;
  productId: string;
  title: string;
  keyMessage: string;
  /** The opening every creator should start from. Optional. */
  hook: string;
  /** Talking points (the brief's must-include). */
  mustInclude: string[];
  /** Restrictions (the brief's avoid). */
  avoid: string[];
  explainer?: Explainer;
  attachments: BriefAttachment[];
  languages: LanguageId[];
  /** Where creators may post; each creator picks one of them when they pick a slot. */
  platforms: CampaignPlatformId[];
  /** The account to tag per platform, as typed (prefilled from the brand's saved handles). */
  handles: Partial<Record<CampaignPlatformId, string>>;
  tierId: FollowerTierId;
  videos: number;
  /** Price per Yapp the brand set; null = the low end of the guidance range (it follows the tier). */
  price: number | null;
  usage: UsageOptionId;
  /** Days a creator has to upload version 1 after picking a slot. */
  deadlineDays: number;
  paymentMethodId: string;
};

export const STEPS = [
  { key: "say", label: "What to say", title: "What should creators say?", lead: "Every creator gets the same brief and makes their own take on it." },
  {
    key: "creators",
    label: "Creators and price",
    title: "Who makes them, and at what price?",
    lead: "Creators post on their own accounts. You set the price per Yapp; the follower tier decides who can pick.",
  },
  { key: "rules", label: "Rules", title: "The rules creators agree to", lead: undefined },
  { key: "pay", label: "Review and pay", title: "Review and publish", lead: "The full amount is held now and paid out one Yapp at a time." },
] as const;

export const LAST_STEP = STEPS.length - 1;

export type FieldKey =
  | "product"
  | "title"
  | "keyMessage"
  | "hook"
  | "mustInclude"
  | "platforms"
  | `handle-${CampaignPlatformId}`
  | "tierId"
  | "videos"
  | "price"
  | "deadline"
  | "usage"
  | "payment";

export function stepOfField(field: FieldKey): number {
  if (field === "product" || field === "title" || field === "keyMessage" || field === "hook" || field === "mustInclude") return 0;
  if (field === "deadline" || field === "usage") return 2;
  if (field === "payment") return 3;
  return 1;
}

export const HOOK_MAX = 300;
/** Quick picks under the number of Yapps. */
export const CAMPAIGN_QUICK = [10, 20, 30, 50].filter((n) => n <= CAMPAIGN_MAX_VIDEOS);

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

/** Fill the brief from a saved product (only what the brand hasn't typed yet). */
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

/** The brand's saved handles ("@daftar.app"), with a guess from the website for the first platform if none is saved. */
function startingHandles(s: DemoState, platforms: CampaignPlatformId[]): Partial<Record<CampaignPlatformId, string>> {
  const saved = me.brandHandles(s);
  const handles: Partial<Record<CampaignPlatformId, string>> = {};
  for (const p of campaignPlatforms) if (saved[p.id]) handles[p.id] = saved[p.id];
  if (!Object.keys(handles).length && platforms[0]) {
    const guess = handleFromWebsite(me.business(s).website);
    if (guess) handles[platforms[0]] = guess;
  }
  return handles;
}

/** A saved form draft (or an older shape): anything missing comes from a fresh form. */
export function normalizeForm(base: CampaignForm, data: Partial<CampaignForm> | undefined): CampaignForm {
  const merged = { ...base, ...(data ?? {}), v: 2 as const };
  const platforms = (merged.platforms ?? []).filter((p) => campaignPlatformById[p]);
  return {
    ...merged,
    platforms: platforms.length ? platforms : base.platforms,
    tierId: tierById[merged.tierId] ? merged.tierId : base.tierId,
    usage: usageById[merged.usage] ? merged.usage : DEFAULT_USAGE,
    deadlineDays: deadlineOrDefault(merged.deadlineDays),
    handles: { ...base.handles, ...(merged.handles ?? {}) },
  };
}

export type CampaignBanner =
  | { kind: "again"; title: string }
  | { kind: "restored"; at: string }
  | { kind: "available"; at: string }
  | null;

export type CampaignInit = { form: CampaignForm; step: number; maxStep: number; banner: CampaignBanner; fresh: CampaignForm };

/**
 * Start fresh (carrying the platforms, languages and deadline over from this account's last
 * campaign), from a saved form draft, from `?product=`, or from an earlier campaign (`?again=` a
 * campaign id, or one of its slots).
 */
export function initialCampaign(s: DemoState, productParam: string, againParam: string): CampaignInit {
  const business = me.business(s);
  const products = s.products.filter((p) => p.businessId === business.id);
  const methods = me.paymentMethods(s);
  const defaultMethod = (methods.find((m) => m.isDefault) ?? methods[0])?.id ?? "";
  const saved = me.brandHandles(s);

  const fromParam = products.find((p) => p.id === productParam);
  const product = fromParam ?? (products.length === 1 ? products[0] : undefined);
  const previous = s.requests
    .filter((r) => r.businessId === business.id && r.campaign)
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))[0];
  const withSaved = campaignPlatforms.filter((p) => saved[p.id]).map((p) => p.id);
  const startPlatforms = previous?.campaign?.platforms.length ? [...previous.campaign.platforms] : withSaved.length ? withSaved : ["tiktok" as const];
  const base: CampaignForm = {
    v: 2,
    productId: "",
    title: "",
    keyMessage: "",
    hook: "",
    mustInclude: [],
    avoid: [],
    explainer: undefined,
    attachments: [],
    languages: previous?.brief.languages.length ? [...previous.brief.languages] : [DEFAULT_LANGUAGE],
    platforms: startPlatforms,
    handles: startingHandles(s, startPlatforms),
    tierId: "t10",
    videos: CAMPAIGN_MIN_VIDEOS,
    price: null,
    usage: DEFAULT_USAGE,
    deadlineDays: deadlineOrDefault(previous?.campaign?.deadlineDays),
    paymentMethodId: defaultMethod,
  };
  const fresh = product ? applyProduct(base, product) : base;

  const slot = s.commissions.find((c) => c.id === againParam && c.source === "campaign");
  const againId = slot?.requestId ?? againParam;
  const again = s.requests.find((r) => r.id === againId && r.businessId === business.id && r.campaign);
  const draft = me.orderDraft<Partial<CampaignForm>>(s, "campaign");

  if (again?.campaign) {
    const terms = again.campaign;
    // Saved handles win; the campaign's own fill any gaps.
    const handles: Partial<Record<CampaignPlatformId, string>> = { ...base.handles };
    for (const platform of terms.platforms) {
      if (!handles[platform] && terms.brandHandles[platform]) handles[platform] = terms.brandHandles[platform];
    }
    const form: CampaignForm = {
      ...base,
      productId: products.some((p) => p.id === again.brief.productId) ? again.brief.productId : "",
      title: again.title,
      keyMessage: again.brief.keyMessage,
      hook: again.brief.hook ?? "",
      mustInclude: [...again.brief.mustInclude],
      avoid: [...again.brief.avoid],
      explainer: terms.explainer ? { name: terms.explainer.name, durationSec: terms.explainer.durationSec, source: "upload" } : undefined,
      attachments: [...(again.brief.attachments ?? [])],
      languages: again.brief.languages.length ? [...again.brief.languages] : base.languages,
      platforms: [...terms.platforms],
      handles,
      tierId: terms.tierId,
      videos: Math.min(CAMPAIGN_MAX_VIDEOS, Math.max(CAMPAIGN_MIN_VIDEOS, again.slots)),
      price: terms.pricePerVideo,
      usage: usageById[again.brief.usage] ? again.brief.usage : DEFAULT_USAGE,
      deadlineDays: deadlineOrDefault(terms.deadlineDays),
      paymentMethodId: methods.some((m) => m.id === terms.paymentMethodId) ? terms.paymentMethodId : defaultMethod,
    };
    return {
      form,
      step: 0,
      maxStep: LAST_STEP,
      banner: draft ? { kind: "available", at: draft.savedAt } : { kind: "again", title: again.title },
      fresh,
    };
  }

  if (draft && (!fromParam || !draft.data.productId || draft.data.productId === fromParam.id)) {
    let form = normalizeForm(base, draft.data);
    if (form.productId && !products.some((p) => p.id === form.productId)) form = { ...form, productId: "" };
    if (fromParam && !form.productId) form = applyProduct(form, fromParam);
    if (!methods.some((m) => m.id === form.paymentMethodId)) form = { ...form, paymentMethodId: defaultMethod };
    const step = Math.min(Math.max(0, draft.step ?? 0), LAST_STEP);
    return { form, step, maxStep: step, banner: { kind: "restored", at: draft.savedAt }, fresh };
  }

  return { form: fresh, step: 0, maxStep: 0, banner: draft ? { kind: "available", at: draft.savedAt } : null, fresh };
}

/* -------------------------------------------------------------------------- */
/* Money                                                                       */
/* -------------------------------------------------------------------------- */

export type CampaignDerived = {
  niche: NicheId;
  guidance: PriceGuidance;
  /** Price per Yapp in force (set, or the low end of the range). */
  price: number;
  /** Below the guidance range: a note, never a block. */
  belowRange: boolean;
  /** Outside $30–$5,000 or not whole dollars: blocks. */
  outOfLimits: boolean;
  /** Yapps × price held at posting, and what each creator receives. */
  budget: ReturnType<typeof campaignBudget>;
};

export function deriveCampaign(s: DemoState, form: CampaignForm, product?: Product): CampaignDerived {
  const niche = product?.niche ?? me.business(s).industry;
  const guidance = priceGuidance(niche, form.tierId);
  const price = form.price ?? guidance.low;
  const outOfLimits = !Number.isInteger(price) || price < PRICE_MIN_PER_YAPP || price > PRICE_MAX_PER_YAPP;
  return {
    niche,
    guidance,
    price,
    belowRange: !outOfLimits && price < guidance.low,
    outOfLimits,
    budget: campaignBudget(form.videos, price),
  };
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

/** "Add the TikTok account creators should tag." / "Use letters, numbers, dots or underscores (2–30)." */
export function handleError(platform: CampaignPlatformId, value: string | undefined): string | undefined {
  const bare = bareHandle(value ?? "");
  if (!bare) return `Add the ${campaignPlatformById[platform].name} account creators should tag.`;
  if (!HANDLE.test(bare)) return "Use letters, numbers, dots or underscores (2 to 30), like @daftar.app.";
  return undefined;
}

export type CampaignErrors = Partial<Record<FieldKey, string>>;

export function validateStep(step: number, form: CampaignForm, d: CampaignDerived, hasProduct: boolean, methodIds: string[]) {
  const errors: CampaignErrors = {};
  if (step === 0) {
    if (!hasProduct) errors.product = "Pick the product this campaign is for, or add one.";
    if (form.title.trim().length < 4) errors.title = "Give the campaign a short title creators will see.";
    if (form.keyMessage.trim().length < 8) errors.keyMessage = "Say in a line what it is and what creators should get across.";
    if (form.hook.trim().length > HOOK_MAX) errors.hook = `Keep the hook under ${HOOK_MAX} characters.`;
    if (!form.mustInclude.some((x) => x.trim())) errors.mustInclude = "Add at least one talking point.";
  }
  if (step === 1) {
    if (!form.platforms.length) errors.platforms = "Pick at least one platform.";
    for (const platform of form.platforms) {
      const problem = handleError(platform, form.handles[platform]);
      if (problem) errors[`handle-${platform}`] = problem;
    }
    if (!tierById[form.tierId]) errors.tierId = "Pick a follower tier.";
    if (form.videos < CAMPAIGN_MIN_VIDEOS || form.videos > CAMPAIGN_MAX_VIDEOS || form.videos % CAMPAIGN_STEP !== 0)
      errors.videos = `Pick ${CAMPAIGN_MIN_VIDEOS} to ${CAMPAIGN_MAX_VIDEOS} Yapps, in steps of ${CAMPAIGN_STEP}.`;
    if (d.outOfLimits)
      errors.price =
        d.price > PRICE_MAX_PER_YAPP
          ? `That looks too high. The most is ${money(PRICE_MAX_PER_YAPP)} per Yapp.`
          : `Set at least ${money(PRICE_MIN_PER_YAPP)} per Yapp, in whole dollars.`;
  }
  if (step === 2) {
    if (!CAMPAIGN_DEADLINE_OPTIONS.some((days) => days === form.deadlineDays)) errors.deadline = "Pick how long creators have to upload.";
    if (!usageById[form.usage]) errors.usage = "Choose how you'll use the videos.";
  }
  if (step === 3 && !methodIds.includes(form.paymentMethodId)) errors.payment = "Pick a card to hold the amount on, or add one.";
  return errors;
}

export function firstInvalidStep(form: CampaignForm, d: CampaignDerived, hasProduct: boolean, methodIds: string[]) {
  return STEPS.findIndex((_, i) => Object.keys(validateStep(i, form, d, hasProduct, methodIds)).length > 0);
}

/* -------------------------------------------------------------------------- */
/* Copy helpers and what posting sends                                         */
/* -------------------------------------------------------------------------- */

/** When a campaign published now stops taking creators. */
export const closesAtIfNow = () => addDays(NOW_ISO, CAMPAIGN_OPEN_DAYS);

/** "paid partnership label" / "paid partnership tag" */
export const disclosureName = (platform: CampaignPlatformId) =>
  campaignPlatformById[platform].disclosure.split(" (")[0].toLowerCase();

/** "@daftar.app on TikTok and Instagram" style: each chosen platform with its handle. */
export const handleList = (form: Pick<CampaignForm, "platforms" | "handles">) =>
  form.platforms.map((p) => ({ platform: p, name: campaignPlatformById[p].name, handle: atHandle(form.handles[p] ?? "") }));

/**
 * Creators on Yapp (never you) with a verified account on one of `platforms` whose real followers
 * fall inside each tier.
 */
export function qualifyingCounts(creators: Creator[], selfId: string | undefined, platforms: CampaignPlatformId[]) {
  const counts: Partial<Record<FollowerTierId, number>> = {};
  for (const id of Object.keys(tierById) as FollowerTierId[]) {
    const tier = tierById[id];
    counts[id] = creators.filter(
      (c) =>
        c.id !== selfId &&
        (c.socials ?? []).some(
          (a) => a.verified && platforms.includes(a.platform) && a.followers >= tier.min && a.followers < tier.max,
        ),
    ).length;
  }
  return counts;
}

export function toCampaignInput(form: CampaignForm, d: CampaignDerived, product: Product): CampaignInput {
  const brandHandles: Partial<Record<CampaignPlatformId, string>> = {};
  for (const platform of form.platforms) {
    const handle = atHandle(form.handles[platform] ?? "");
    if (handle) brandHandles[platform] = handle;
  }
  return {
    title: form.title.trim(),
    productId: product.id,
    brief: {
      keyMessage: form.keyMessage.trim(),
      hook: form.hook.trim() || undefined,
      mustInclude: form.mustInclude.map((x) => x.trim()).filter(Boolean),
      avoid: form.avoid.map((x) => x.trim()).filter(Boolean),
      languages: form.languages.length ? form.languages : undefined,
      audience: product.audience || undefined,
      attachments: form.attachments.length ? form.attachments : undefined,
    },
    videos: form.videos,
    tierId: form.tierId,
    pricePerVideo: d.price,
    usage: form.usage,
    deadlineDays: form.deadlineDays,
    platforms: form.platforms,
    brandHandles,
    explainer: form.explainer ? { name: form.explainer.name, durationSec: form.explainer.durationSec } : undefined,
    paymentMethodId: form.paymentMethodId,
  };
}
