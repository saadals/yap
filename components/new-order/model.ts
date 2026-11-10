/**
 * The new-order form (Work spec 6.11): one wizard for both kinds of order, a UGC campaign and a
 * custom order (video or ad copy). This file holds its data, defaults, how it is restored (a saved
 * draft, an earlier order, the URL), per-step validation and what it posts. Pure: no React and no
 * store writes, so it is safe in render.
 *
 * Money comes from lib/: `priceGuidance` (campaign guidance range), `campaignBudget` (total and
 * each creator's net), `marketFor` (a custom order's range from real creator quotes) and
 * `priceLimits` / `priceLimitError`. Nothing here recomputes a fee.
 */

import { marketFor, type Market } from "@/components/requests/shared";
import { campaignBudget } from "@/lib/campaigns";
import { money, plural, priceLimitError, priceLimits } from "@/lib/format";
import { priceGuidance, type PriceGuidance } from "@/lib/pricing";
import { me } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import {
  BUDGET_MIN,
  CAMPAIGN_MAX_VIDEOS,
  CAMPAIGN_MIN_VIDEOS,
  CAMPAIGN_STEP,
  DEFAULT_LANGUAGE,
  DEFAULT_USAGE,
  ORDER_DEADLINE_DEFAULT,
  ORDER_DEADLINE_OPTIONS,
  PRICE_MAX_PER_YAPP,
  PRICE_MIN_PER_YAPP,
  campaignPlatformById,
  campaignPlatforms,
  formatById,
  languageById,
  nicheById,
  usageById,
} from "@/lib/taxonomy";
import type {
  AddonId,
  Aspect,
  Brief,
  BriefAttachment,
  CampaignPlatformId,
  ContentRequest,
  CreatorKind,
  FollowerTierId,
  FormatId,
  JobType,
  LanguageId,
  NicheId,
  PlatformId,
  Product,
  Reference,
  UsageOptionId,
} from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Steps and limits                                                            */
/* -------------------------------------------------------------------------- */

export const STEP_LABELS = ["Type", "Size & price", "Basics", "Brief", "Deadline", "Post"] as const;
export const LAST_STEP = STEP_LABELS.length - 1;

export type OrderKind = "campaign" | "custom";

/** `productId` when the brand is adding a product in the form (saved as a product when it posts). */
export const NEW_PRODUCT = "new";

export const HOOK_MIN = 10;
export const HOOK_MAX = 300;
export const MUST_MIN = 10;
/**
 * "Must show" and "Don't say" hold one line each (each line becomes a checkbox the creator ticks
 * before sending). The spec's 300 characters is the hook's; three of a product's dos already
 * fill 300, so the lists get 600.
 */
export const LIST_MAX = 600;
export const TITLE_MIN = 6;
export const TITLE_MAX = 90;
export const PRODUCT_NAME_MIN = 2;
export const PRODUCT_NAME_MAX = 60;
export const VIDEO_COUNT_MAX = 10;
/** The quick picks under the number of Yapps (the demo stops at 50; answers, item 61). */
export const CAMPAIGN_QUICK = [10, 20, 30, 50].filter((n) => n <= CAMPAIGN_MAX_VIDEOS);
/** Letters, numbers, dots or underscores, 2–30 (Work spec 6.11.6). */
export const HANDLE_RE = /^[A-Za-z0-9._]{2,30}$/;

/* -------------------------------------------------------------------------- */
/* The form                                                                    */
/* -------------------------------------------------------------------------- */

export type ExplainerValue = { name: string; durationSec: number; source: "upload" | "asset"; assetId?: string };

/** Everything the wizard asks, in a shape that survives JSON (it is the saved draft's `data`). */
export type NewOrderForm = {
  v: 1;
  kind: OrderKind | null;
  /** The order's category: the product's (orders are listed under their product's category). */
  category: NicheId | "";
  /** Custom orders only; a campaign is always a full video. */
  jobType: JobType;

  /* Size & price: campaign */
  tierId: FollowerTierId;
  videos: number;
  /** Price per Yapp the brand set; null = the low end of the guidance range (it follows the tier). */
  price: number | null;
  /* Size & price: custom order */
  videoCount: number;
  /** null = follow the market's middle until the brand sets it. */
  budget: { min: number; max: number } | null;
  /** Show "From" as well as the budget. */
  budgetRange: boolean;

  /* Basics */
  productId: string;
  newProduct: { name: string; oneLiner: string };
  format: FormatId | null;
  /** Custom order: where the brand will run it (Meta ads included). */
  platforms: PlatformId[];
  /** Campaign: where creators may post (connectable platforms only). */
  campaignPlatforms: CampaignPlatformId[];
  /** Handles the brand typed here, without "@" (otherwise the saved one is used). */
  handles: Partial<Record<CampaignPlatformId, string>>;
  languages: LanguageId[];
  visibility: "public" | "invite";
  invitedCreatorIds: string[];
  preferredKinds: CreatorKind[];

  /* Brief */
  hook: string;
  /** One line each. */
  mustShow: string;
  dontSay: string;
  /** Ad copy: what to write, one line each, and where it runs. */
  copyPieces: string;
  copyPlacements: PlatformId[];
  attachments: BriefAttachment[];
  /* More detail (optional) */
  audience: string;
  goal: string;
  keyMessage: string;
  notes: string;
  references: Reference[];
  durationSec: number;
  aspect: Aspect;
  onCamera: boolean;
  explainer?: ExplainerValue;

  /* Deadline and rights */
  deadlineDays: number;
  usage: UsageOptionId;
  addons: AddonId[];

  /* Post */
  title: string;
  /** False while the title follows the suggestion. */
  titleTouched: boolean;
  paymentMethodId: string;
  /** Never saved in a draft: confirm again after coming back. */
  agree: boolean;
};

export type FormPatch = Partial<NewOrderForm> | ((form: NewOrderForm) => Partial<NewOrderForm>);

export function defaultForm(s: DemoState, product?: Product): NewOrderForm {
  const saved = me.brandHandles(s);
  const withHandle = campaignPlatforms.filter((p) => saved[p.id]).map((p) => p.id);
  const methods = me.paymentMethods(s);
  const businessId = me.ids(s).businessId;
  // No saved products yet: start on "New product" so the name field is right there.
  const noProducts = !s.products.some((p) => p.businessId === businessId);
  return {
    v: 1,
    kind: null,
    category: product?.niche ?? "",
    jobType: "video",
    tierId: "t10",
    videos: CAMPAIGN_MIN_VIDEOS,
    price: null,
    videoCount: 1,
    budget: null,
    budgetRange: false,
    productId: product?.id ?? (noProducts ? NEW_PRODUCT : ""),
    newProduct: { name: "", oneLiner: "" },
    format: null,
    platforms: ["tiktok", "instagram"],
    campaignPlatforms: withHandle.length ? withHandle : ["tiktok"],
    handles: {},
    languages: [DEFAULT_LANGUAGE],
    visibility: "public",
    invitedCreatorIds: [],
    preferredKinds: [],
    hook: "",
    mustShow: "",
    dontSay: "",
    copyPieces: "",
    copyPlacements: ["meta-ads"],
    attachments: [],
    audience: product?.audience ?? "",
    goal: "",
    keyMessage: "",
    notes: "",
    references: [],
    durationSec: 30,
    aspect: "9:16",
    onCamera: true,
    explainer: undefined,
    deadlineDays: ORDER_DEADLINE_DEFAULT,
    usage: DEFAULT_USAGE,
    addons: [],
    title: "",
    titleTouched: false,
    paymentMethodId: (methods.find((m) => m.isDefault) ?? methods[0])?.id ?? "",
    agree: false,
  };
}

/** Picking a saved product: its category becomes the order's, and its audience fills an empty one. */
export function applyProduct(form: NewOrderForm, next: Product, previous?: Product): NewOrderForm {
  const audienceUntouched = !form.audience.trim() || form.audience === previous?.audience;
  return {
    ...form,
    productId: next.id,
    category: next.niche,
    audience: audienceUntouched ? next.audience : form.audience,
  };
}

/** A draft as saved (or an older shape): fill in anything missing from the defaults. */
export function normalizeForm(s: DemoState, data: Partial<NewOrderForm>): NewOrderForm {
  const base = defaultForm(s);
  return { ...base, ...data, v: 1, agree: false, newProduct: { ...base.newProduct, ...(data.newProduct ?? {}) } };
}

/** What a draft stores (no confirmation tick). */
export function draftData(form: NewOrderForm): NewOrderForm {
  return { ...form, agree: false };
}

/* -------------------------------------------------------------------------- */
/* Text helpers                                                                */
/* -------------------------------------------------------------------------- */

/** Non-empty trimmed lines. */
export const linesOf = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Add a line if it isn't there yet, or take it out if it is. */
export function toggleLine(text: string, line: string): string {
  const lines = text.split("\n").map((l) => l.trim());
  if (lines.includes(line.trim())) return lines.filter((l) => l && l !== line.trim()).join("\n");
  return [...lines.filter(Boolean), line.trim()].join("\n");
}

export const hasLine = (text: string, line: string) => linesOf(text).includes(line.trim());

export const bareHandle = (value: string) => value.trim().replace(/^@+/, "");

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "App demos for Daftar Invoices", "3 Spanish testimonials for Notewren", "Ad copy for Brindle". */
export function suggestTitle(form: NewOrderForm, productName: string): string {
  if (!productName) return "";
  const forProduct = ` for ${productName}`;
  if (form.kind === "custom" && form.jobType === "ad-copy") return `Ad copy${forProduct}`;
  if (form.kind === "campaign") {
    if (!form.format) return `UGC campaign${forProduct}`;
    return capitalize(`${formatById[form.format].noun[1]}${forProduct}`);
  }
  if (!form.format) return `New video${forProduct}`;
  const other = form.languages.filter((l) => l !== DEFAULT_LANGUAGE);
  const language = other.length === 1 && form.languages.length === 1 ? `${languageById[other[0]].name} ` : "";
  if (form.format === "hook-pack") return capitalize(`${form.videoCount} ${language}ad hooks${forProduct}`);
  const [one, many] = formatById[form.format].noun;
  const count = form.videoCount > 1 ? `${form.videoCount} ` : "";
  return capitalize(`${count}${language}${form.videoCount > 1 ? many : one}${forProduct}`);
}

/** The name a draft shows in a list until it has a title. */
export const untitled = (kind: OrderKind) => (kind === "campaign" ? "Untitled UGC campaign" : "Untitled custom order");

/* -------------------------------------------------------------------------- */
/* Derived values (money, market, handles, title)                              */
/* -------------------------------------------------------------------------- */

export type Derived = {
  products: Product[];
  product?: Product;
  productName: string;
  niche?: NicheId;
  adCopy: boolean;
  /** Campaign guidance range for the category and tier. */
  guidance: PriceGuidance;
  /** Price per Yapp in force (set, or the low end of the range). */
  price: number;
  /** Below the guidance range (a warning, never a block). */
  belowRange: boolean;
  campaign: ReturnType<typeof campaignBudget>;
  /** Custom orders: what creators who fit usually quote. */
  market: Market;
  /** The custom order's budget in force. */
  budget: { min: number; max: number };
  /** Creators who fit whose usual quote is within the budget. */
  inBudget: number;
  savedHandles: Partial<Record<CampaignPlatformId, string>>;
  /** The handle to tag on each campaign platform, without "@" (typed here, or saved). */
  handles: Partial<Record<CampaignPlatformId, string>>;
  suggestion: string;
  title: string;
  /** A physical product: Yapp doesn't ship products yet (answers, item 24). */
  physical: boolean;
  paymentMethodIds: string[];
  brandName: string;
};

/** A middle-of-the-market budget, or $300 when there are no quotes to go on. */
export function suggestedBudget(market: Market): { min: number; max: number } {
  const value = market.count ? Math.max(BUDGET_MIN, market.median) : 300;
  return { min: value, max: value };
}

export function derive(s: DemoState, form: NewOrderForm): Derived {
  const business = me.business(s);
  const products = s.products.filter((p) => p.businessId === business.id);
  const product = products.find((p) => p.id === form.productId);
  const niche = form.category || undefined;
  const adCopy = form.kind === "custom" && form.jobType === "ad-copy";
  const guidance = priceGuidance(niche, form.tierId);
  const price = form.price ?? guidance.low;
  const marketFormat: FormatId | null = adCopy ? "ad-copy" : form.format;
  const units = adCopy ? 1 : form.videoCount;
  const market = marketFor(s, marketFormat, form.languages, units, { min: 0, max: 0 }, adCopy ? undefined : form.durationSec);
  const budget = form.budget ?? suggestedBudget(market);
  const savedHandles: Partial<Record<CampaignPlatformId, string>> = {};
  for (const [platform, handle] of Object.entries(me.brandHandles(s)) as [CampaignPlatformId, string | undefined][]) {
    if (handle) savedHandles[platform] = bareHandle(handle);
  }
  const handles: Partial<Record<CampaignPlatformId, string>> = {};
  for (const platform of campaignPlatforms) {
    const value = form.handles[platform.id] ?? savedHandles[platform.id];
    if (value !== undefined) handles[platform.id] = value;
  }
  const productName =
    product?.name ?? (form.productId === NEW_PRODUCT ? form.newProduct.name.trim() : "");
  const suggestion = suggestTitle(form, productName);
  return {
    products,
    product,
    productName,
    niche,
    adCopy,
    guidance,
    price,
    belowRange: price >= PRICE_MIN_PER_YAPP && price < guidance.low,
    campaign: campaignBudget(form.videos, price),
    market,
    budget,
    inBudget: market.pool.filter((q) => q.price <= budget.max).length,
    savedHandles,
    handles,
    suggestion,
    title: form.titleTouched ? form.title : suggestion,
    physical: form.category === "gadgets" || (!adCopy && form.format === "unboxing"),
    paymentMethodIds: me.paymentMethods(s).map((m) => m.id),
    brandName: business.name,
  };
}

/** The most a custom order's budget can be: $5,000 a video. */
export const budgetMax = (form: NewOrderForm, adCopy: boolean) => priceLimits(adCopy ? 1 : form.videoCount).max;

/* -------------------------------------------------------------------------- */
/* Validation (Work spec 6.11.11)                                              */
/* -------------------------------------------------------------------------- */

export type FieldKey =
  | "kind"
  | "category"
  | "tier"
  | "videos"
  | "price"
  | "videoCount"
  | "budget"
  | "product"
  | "newName"
  | "format"
  | "platforms"
  | `handle-${CampaignPlatformId}`
  | "languages"
  | "invites"
  | "hook"
  | "copyPieces"
  | "copyPlacements"
  | "mustShow"
  | "dontSay"
  | "deadline"
  | "usage"
  | "title"
  | "payment"
  | "agree";

export type Errors = Partial<Record<FieldKey, string>>;

/** Fields in the order they appear on screen: the first one with an error gets focus. */
export const FIELD_ORDER: FieldKey[] = [
  "kind",
  "category",
  "tier",
  "videos",
  "price",
  "videoCount",
  "budget",
  "product",
  "newName",
  "format",
  "platforms",
  "handle-tiktok",
  "handle-instagram",
  "handle-snapchat",
  "languages",
  "invites",
  "copyPieces",
  "copyPlacements",
  "hook",
  "mustShow",
  "dontSay",
  "deadline",
  "usage",
  "title",
  "payment",
  "agree",
];

/** The element id a field's control carries, for focus and `aria-describedby`. */
export const fieldId = (key: FieldKey | string) => `nwf-${key}`;
export const errorId = (key: FieldKey | string) => `nwf-${key}-error`;

/** "Add the TikTok account creators should tag." / "Use letters, numbers, dots or underscores (2–30)." */
export function handleError(platform: CampaignPlatformId, value: string | undefined): string | undefined {
  const bare = bareHandle(value ?? "");
  if (!bare) return `Add the ${campaignPlatformById[platform].name} account creators should tag.`;
  if (!HANDLE_RE.test(bare)) return "Use letters, numbers, dots or underscores (2–30).";
  return undefined;
}

export function validateStep(step: number, form: NewOrderForm, d: Derived): Errors {
  const e: Errors = {};
  const campaign = form.kind === "campaign";
  if (step === 0) {
    if (!form.kind) e.kind = "Choose UGC campaign or custom order.";
    if (!form.category) e.category = "Choose a category.";
  }
  if (step === 1 && form.kind) {
    if (campaign) {
      if (form.videos < CAMPAIGN_MIN_VIDEOS || form.videos % CAMPAIGN_STEP !== 0)
        e.videos = `Use ${CAMPAIGN_MIN_VIDEOS} or more, in steps of ${CAMPAIGN_STEP}.`;
      else if (form.videos > CAMPAIGN_MAX_VIDEOS) e.videos = `Up to ${CAMPAIGN_MAX_VIDEOS} Yapps in this demo.`;
      if (priceLimitError(d.price) !== null)
        e.price =
          d.price > PRICE_MAX_PER_YAPP
            ? `That looks too high. Max ${money(PRICE_MAX_PER_YAPP)} per Yapp.`
            : `Minimum is ${money(PRICE_MIN_PER_YAPP)} per Yapp.`;
    } else {
      if (!d.adCopy && (form.videoCount < 1 || form.videoCount > VIDEO_COUNT_MAX))
        e.videoCount = `Pick 1 to ${VIDEO_COUNT_MAX}.`;
      const max = budgetMax(form, d.adCopy);
      const { min: low, max: high } = d.budget;
      if (!Number.isInteger(high) || high < BUDGET_MIN) e.budget = `Minimum budget is ${money(BUDGET_MIN)}.`;
      else if (high > max)
        e.budget = d.adCopy || form.videoCount === 1
          ? `Max budget is ${money(max)}.`
          : `Max budget is ${money(PRICE_MAX_PER_YAPP)} a video, ${money(max)} for ${form.videoCount}.`;
      else if (form.budgetRange && (!Number.isInteger(low) || low < BUDGET_MIN))
        e.budget = `The lowest can't be under ${money(BUDGET_MIN)}.`;
      else if (form.budgetRange && low > high) e.budget = "The lowest can't be above the budget.";
    }
  }
  if (step === 2 && form.kind) {
    if (!form.productId || (form.productId !== NEW_PRODUCT && !d.product))
      e.product = "Pick a product, or add a new one.";
    else if (form.productId === NEW_PRODUCT) {
      const name = form.newProduct.name.trim();
      if (name.length < PRODUCT_NAME_MIN) e.newName = "Add your product name (2+ characters).";
      else if (name.length > PRODUCT_NAME_MAX) e.newName = `Keep the name under ${PRODUCT_NAME_MAX} characters.`;
    }
    if (!d.adCopy && !form.format) e.format = "Choose a format.";
    if (campaign) {
      if (!form.campaignPlatforms.length) e.platforms = "Pick at least one platform.";
      for (const platform of form.campaignPlatforms) {
        const problem = handleError(platform, d.handles[platform]);
        if (problem) e[`handle-${platform}`] = problem;
      }
    } else if (!d.adCopy && !form.platforms.length) e.platforms = "Pick at least one platform.";
    if (!form.languages.length) e.languages = d.adCopy ? "Pick the language to write in." : "Pick the video language.";
    if (!campaign && form.visibility === "invite" && !form.invitedCreatorIds.length)
      e.invites = "Invite at least one creator, or let everyone who fits pitch.";
  }
  if (step === 3 && form.kind) {
    const must = form.mustShow.trim();
    const avoid = form.dontSay.trim();
    if (d.adCopy) {
      if (!linesOf(form.copyPieces).length) e.copyPieces = "Say what to write, one piece per line.";
      if (!form.copyPlacements.length) e.copyPlacements = "Pick where the copy will run.";
      if (form.hook.trim().length > HOOK_MAX) e.hook = `Keep it under ${HOOK_MAX} characters.`;
      if (must.length < MUST_MIN) e.mustShow = "Say what the copy must get across (10+ characters).";
    } else {
      const hook = form.hook.trim();
      if (hook.length < HOOK_MIN) e.hook = "Describe the hook in at least 10 characters.";
      else if (hook.length > HOOK_MAX) e.hook = `Keep the hook under ${HOOK_MAX} characters.`;
      if (must.length < MUST_MIN) e.mustShow = "Say what must be shown (10+ characters).";
    }
    if (must.length > LIST_MAX) e.mustShow = `Keep it under ${LIST_MAX} characters. Short and clear wins.`;
    if (avoid.length > LIST_MAX) e.dontSay = `Keep it under ${LIST_MAX} characters.`;
  }
  if (step === 4 && form.kind) {
    if (!(ORDER_DEADLINE_OPTIONS as readonly number[]).includes(form.deadlineDays)) e.deadline = "Pick a deadline.";
    if (!usageById[form.usage]) e.usage = "Choose usage rights.";
  }
  if (step === 5 && form.kind) {
    const title = d.title.trim();
    if (title.length < TITLE_MIN) e.title = `Give it a title of at least ${TITLE_MIN} characters.`;
    else if (title.length > TITLE_MAX) e.title = `Keep the title under ${TITLE_MAX} characters.`;
    if (campaign && !d.paymentMethodIds.includes(form.paymentMethodId))
      e.payment = "Pick a card to hold the amount on, or add one.";
    if (!form.agree) e.agree = "Confirm before posting.";
  }
  return e;
}

/** The first step with something to fix (-1 when every step is valid). */
export function firstInvalidStep(form: NewOrderForm, d: Derived): number {
  for (let step = 0; step <= LAST_STEP; step++) {
    if (Object.keys(validateStep(step, form, d)).length) return step;
  }
  return -1;
}

/** Where a link to `wanted` lands: that step, or the first earlier one that isn't valid. */
export function landingStep(form: NewOrderForm, d: Derived, wanted: number): number {
  const target = Math.max(0, Math.min(LAST_STEP, wanted));
  const bad = firstInvalidStep(form, d);
  return bad >= 0 && bad < target ? bad : target;
}

/* -------------------------------------------------------------------------- */
/* What posting sends                                                          */
/* -------------------------------------------------------------------------- */

/** The note a physical product's brief carries (answers, item 24). */
export const OWN_PRODUCT_NOTE = "Use a product you already own: Yapp doesn't ship products yet.";

export function briefFrom(form: NewOrderForm, d: Derived, productId: string): Brief {
  const notes = [form.notes.trim(), d.physical && !form.notes.includes(OWN_PRODUCT_NOTE) ? OWN_PRODUCT_NOTE : ""]
    .filter(Boolean)
    .join("\n");
  const references = form.references
    .map((r) => ({ ...r, label: r.label.trim(), note: r.note?.trim() || undefined }))
    .filter((r) => r.label);
  return {
    productId,
    jobType: d.adCopy ? "ad-copy" : "video",
    format: d.adCopy ? "ad-copy" : (form.format ?? "app-demo"),
    platforms: d.adCopy ? [] : form.kind === "campaign" ? form.campaignPlatforms : form.platforms,
    languages: form.languages.length ? form.languages : [DEFAULT_LANGUAGE],
    aspect: form.aspect,
    videoCount: form.kind === "custom" && !d.adCopy ? form.videoCount : 1,
    durationSec: d.adCopy ? 0 : form.durationSec,
    hook: form.hook.trim() || undefined,
    copy: d.adCopy ? { pieces: linesOf(form.copyPieces), placements: form.copyPlacements } : undefined,
    attachments: form.attachments.length ? form.attachments : undefined,
    audience: form.audience.trim(),
    goal: form.goal.trim(),
    keyMessage: form.keyMessage.trim() || d.product?.oneLiner || form.newProduct.oneLiner.trim(),
    mustInclude: linesOf(form.mustShow),
    avoid: linesOf(form.dontSay),
    references,
    onCamera: d.adCopy ? false : form.onCamera,
    usage: form.usage,
    addons: form.kind === "custom" && !d.adCopy ? form.addons : [],
    notes: notes || undefined,
  };
}

/** The budget a custom order posts with. */
export const postedBudget = (form: NewOrderForm, d: Derived) =>
  form.budgetRange ? d.budget : { min: d.budget.max, max: d.budget.max };

/* -------------------------------------------------------------------------- */
/* Starting from an earlier order or a saved draft order                      */
/* -------------------------------------------------------------------------- */

/** Run an order again (or edit a draft order): every field carried over. */
export function formFromRequest(s: DemoState, request: ContentRequest): NewOrderForm {
  const products = s.products.filter((p) => p.businessId === request.businessId);
  const product = products.find((p) => p.id === request.brief.productId);
  const base = defaultForm(s, product);
  const b = request.brief;
  const adCopy = b.jobType === "ad-copy" || b.format === "ad-copy";
  const terms = request.campaign;
  const methods = me.paymentMethods(s);
  const form: NewOrderForm = {
    ...base,
    kind: terms ? "campaign" : "custom",
    category: product?.niche ?? base.category,
    jobType: adCopy && !terms ? "ad-copy" : "video",
    productId: product?.id ?? "",
    format: adCopy ? null : b.format,
    languages: b.languages.length ? [...b.languages] : base.languages,
    hook: b.hook ?? "",
    mustShow: b.mustInclude.join("\n"),
    dontSay: b.avoid.join("\n"),
    copyPieces: b.copy?.pieces.join("\n") ?? "",
    copyPlacements: b.copy?.placements.length ? [...b.copy.placements] : base.copyPlacements,
    attachments: b.attachments ? [...b.attachments] : [],
    audience: b.audience,
    goal: b.goal,
    keyMessage: b.keyMessage,
    notes: (b.notes ?? "").replace(OWN_PRODUCT_NOTE, "").trim(),
    references: b.references.map((r) => ({ ...r })),
    durationSec: b.durationSec || base.durationSec,
    aspect: b.aspect,
    onCamera: b.onCamera,
    usage: b.usage ?? DEFAULT_USAGE,
    addons: [...b.addons],
    title: request.title,
    titleTouched: true,
  };
  if (terms) {
    form.tierId = terms.tierId;
    form.videos = Math.min(CAMPAIGN_MAX_VIDEOS, Math.max(CAMPAIGN_MIN_VIDEOS, request.slots));
    form.price = terms.pricePerVideo;
    form.campaignPlatforms = [...terms.platforms];
    // Saved handles win; the campaign's own fill any gaps.
    const handles: Partial<Record<CampaignPlatformId, string>> = {};
    for (const platform of terms.platforms) {
      const saved = me.brandHandles(s)[platform];
      const own = terms.brandHandles[platform];
      if (!saved && own) handles[platform] = bareHandle(own);
    }
    form.handles = handles;
    form.deadlineDays = terms.deadlineDays;
    form.explainer = terms.explainer
      ? { name: terms.explainer.name, durationSec: terms.explainer.durationSec, source: "upload" }
      : undefined;
    form.paymentMethodId = methods.some((m) => m.id === terms.paymentMethodId) ? terms.paymentMethodId : base.paymentMethodId;
  } else {
    form.videoCount = adCopy ? 1 : Math.min(VIDEO_COUNT_MAX, Math.max(1, b.videoCount));
    form.budget = { ...request.budget };
    form.budgetRange = request.budget.min !== request.budget.max;
    form.platforms = adCopy ? base.platforms : [...b.platforms];
    form.visibility = request.visibility;
    form.invitedCreatorIds = [...request.invitedCreatorIds];
    form.preferredKinds = [...request.preferredKinds];
    form.deadlineDays = (ORDER_DEADLINE_OPTIONS as readonly number[]).includes(request.deadlineDays ?? -1)
      ? request.deadlineDays!
      : ORDER_DEADLINE_DEFAULT;
  }
  return form;
}

/* -------------------------------------------------------------------------- */
/* Copy                                                                        */
/* -------------------------------------------------------------------------- */

export const kindName = (kind: OrderKind) => (kind === "campaign" ? "UGC campaign" : "Custom order");
/** Mid-sentence: "your unfinished UGC campaign", "your unfinished custom order". */
export const kindPhrase = (kind: OrderKind) => (kind === "campaign" ? "UGC campaign" : "custom order");

/** "AI tools at 10K–20K" style category label ("tech products" before one is picked). */
export const categoryLabel = (niche?: NicheId) => (niche ? nicheById[niche].name : "tech products");

/** "10 Yapps × $140 = $1,400" */
export const campaignTotalLine = (d: Derived) =>
  `${plural(d.campaign.videos, "Yapp")} × ${money(d.price)} = ${money(d.campaign.total)}`;
