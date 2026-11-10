/**
 * The custom order flow (creators pitch an idea and a price, the brand picks one): its form, how it's
 * prefilled (fresh, from a product, a saved form draft, a saved draft order, an earlier order or an
 * earlier job), validation per step, market guidance from real creator packages, and the order it
 * posts. Pure; safe in render. Rules follow V1's new-order model (round 3 stage 2): a job type
 * (video or ad copy writing), a usage option included in the price, a delivery deadline the brand
 * sets, an optional hook line, brief attachments, a $50 minimum budget, no fee on top.
 */

import { NOW_ISO, addDays, at } from "@/lib/clock";
import { lengthLabel, money, num, plural } from "@/lib/format";
import { fit, jobTypeOf, type Fit } from "@/lib/selectors";
import { activeIds, type DemoState, type NewRequestInput } from "@/lib/store";
import {
  BUDGET_MIN,
  DEFAULT_LANGUAGE,
  DEFAULT_USAGE,
  ORDER_DEADLINE_DEFAULT,
  ORDER_DEADLINE_OPTIONS,
  ORDER_OPEN_DAYS,
  PRICE_MAX_PER_YAPP,
  PRICE_MIN_PER_YAPP,
  formatById,
  languageById,
  usageById,
} from "@/lib/taxonomy";
import type {
  AddonId,
  Aspect,
  Brief,
  BriefAttachment,
  Commission,
  ContentRequest,
  Creator,
  CreatorKind,
  FormatId,
  JobType,
  LanguageId,
  PlatformId,
  Product,
  Reference,
  UsageOptionId,
} from "@/lib/types";

/** Everything the custom order flow asks. It survives JSON: it is the saved form draft's `data`. */
export type PitchesForm = {
  v: 2;
  productId: string;
  /** The product's learnings attached to this brief (added to must-include when posting). */
  learningIds: string[];
  /** Video, or ad copy writing (no format, length, platforms or camera). */
  jobType: JobType;
  /** Video format (never "ad-copy"; ad copy is the job type). */
  format: FormatId | null;
  /** Ad copy: what to write, one piece per line ("5 headlines, up to 40 characters"). */
  copyPieces: string[];
  /** Ad copy: where the brand will run it. */
  copyPlacements: PlatformId[];
  videoCount: number;
  durationSec: number;
  aspect: Aspect;
  platforms: PlatformId[];
  onCamera: boolean;
  languages: LanguageId[];
  preferredKinds: CreatorKind[];
  title: string;
  /** False while the title still follows the suggestion. */
  titleTouched: boolean;
  /** The opening (ad copy: the opening line or angle). Optional. */
  hook: string;
  /** Files creators see before they pitch (simulated; checked by lib/files.ts). */
  attachments: BriefAttachment[];
  audience: string;
  goal: string;
  keyMessage: string;
  mustInclude: string[];
  avoid: string[];
  references: Reference[];
  notes: string;
  /** How the brand may use the work; included in the price. */
  usage: UsageOptionId;
  addons: AddonId[];
  /** Budget per video (per pack for hook packs, for the whole job for ad copy). The order stores the total. */
  perVideo: { min: number; max: number };
  /** False until the brand sets the budget (we then suggest the market range). */
  budgetTouched: boolean;
  /** Days the hired creator has to deliver version 1 (ORDER_DEADLINE_OPTIONS). */
  deadlineDays: number;
  visibility: "public" | "invite";
  invitedCreatorIds: string[];
};

export const STEPS = [
  {
    key: "product",
    label: "Product",
    title: "Which product is it for?",
    lead: "Creators get its audience, tone, dos and don'ts with the brief, so you don't repeat them.",
  },
  { key: "work", label: "What to make", title: "What should creators make?", lead: undefined },
  {
    key: "terms",
    label: "Budget and terms",
    title: "Budget, deadline and who can pitch",
    lead: "You pay nothing to post. Creators pitch a price within your range.",
  },
  { key: "review", label: "Review", title: "Check it and post", lead: "This is the brief creators will see." },
] as const;

export const LAST_STEP = STEPS.length - 1;

/** The longest hook line. */
export const HOOK_MAX = 300;
export const TITLE_MIN = 6;
export const TITLE_MAX = 90;
export const VIDEO_COUNT_MAX = 10;

/** Extras a brand can ask creators to quote for (rush and extra revisions are agreed later). */
export const WANTED_ADDONS: AddonId[] = ["subtitles", "extra-hooks", "post-to-account"];

/** What an ad-copy order usually asks for (the placeholder and "Use these"). */
export const AD_COPY_PIECES = [
  "5 headlines, up to 40 characters",
  "5 primary texts, up to 125 characters",
  "2 calls to action",
];

type UnitForm = Pick<PitchesForm, "jobType" | "format" | "videoCount">;

export const isAdCopyForm = (form: Pick<PitchesForm, "jobType">) => form.jobType === "ad-copy";

/**
 * Switch the job type. A product's dos and its learnings from earlier video jobs are filming
 * directions, so ad copy leaves them out while the brand hasn't edited them; switching back to
 * video brings them back.
 */
export function withJobType(s: DemoState, form: PitchesForm, jobType: JobType, product?: Product): Partial<PitchesForm> {
  if (form.jobType === jobType) return {};
  if (!product) return { jobType };
  const dos = product.dos;
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  const all = product.learnings.map((l) => l.id);
  const fromCopy = product.learnings
    .filter((l) => {
      const source = s.commissions.find((c) => c.id === l.sourceCommissionId);
      return source ? jobTypeOf(source) === "ad-copy" : false;
    })
    .map((l) => l.id);
  if (jobType === "ad-copy") {
    return {
      jobType,
      mustInclude: same(form.mustInclude, dos) ? [] : form.mustInclude,
      learningIds: same(form.learningIds, all) ? fromCopy : form.learningIds,
    };
  }
  return {
    jobType,
    mustInclude: form.mustInclude.length ? form.mustInclude : [...dos],
    learningIds: same(form.learningIds, fromCopy) ? all : form.learningIds,
  };
}

/** A hook pack holds up to five hooks and is priced as one pack; ad copy is one job; video per video. */
export const unitsFor = (form: UnitForm) =>
  isAdCopyForm(form) ? 1 : form.format === "hook-pack" ? Math.max(1, Math.ceil(form.videoCount / 5)) : Math.max(1, form.videoCount);

/** "video", "pack", or null for ad copy (the budget is for the whole job). */
export const unitWord = (form: Pick<PitchesForm, "jobType" | "format">): "video" | "pack" | null =>
  isAdCopyForm(form) ? null : form.format === "hook-pack" ? "pack" : "video";

/** " a video", " a pack", or "" for ad copy. */
export const perUnit = (form: Pick<PitchesForm, "jobType" | "format">) => {
  const unit = unitWord(form);
  return unit ? ` a ${unit}` : "";
};

const round10 = (n: number) => Math.round(n / 10) * 10;
const clampPrice = (n: number) => Math.min(PRICE_MAX_PER_YAPP, Math.max(PRICE_MIN_PER_YAPP, Math.round(n)));
const isDeadline = (days: number | undefined) => (ORDER_DEADLINE_OPTIONS as readonly number[]).includes(days ?? -1);
const cleanLines = (items: string[]) => items.map((x) => x.trim()).filter(Boolean);

/* -------------------------------------------------------------------------- */
/* Defaults and prefill                                                        */
/* -------------------------------------------------------------------------- */

export function defaultForm(product?: Product): PitchesForm {
  return {
    v: 2,
    productId: product?.id ?? "",
    learningIds: product?.learnings.map((l) => l.id) ?? [],
    jobType: "video",
    format: null,
    copyPieces: [],
    copyPlacements: ["meta-ads"],
    videoCount: 1,
    durationSec: 60,
    aspect: "9:16",
    platforms: ["tiktok", "instagram"],
    onCamera: true,
    languages: [DEFAULT_LANGUAGE],
    preferredKinds: [],
    title: "",
    titleTouched: false,
    hook: "",
    attachments: [],
    audience: product?.audience ?? "",
    goal: "",
    keyMessage: product?.oneLiner ?? "",
    mustInclude: product ? [...product.dos] : [],
    avoid: product ? [...product.donts] : [],
    references: [],
    notes: "",
    usage: DEFAULT_USAGE,
    addons: [],
    perVideo: { min: 150, max: 300 },
    budgetTouched: false,
    deadlineDays: ORDER_DEADLINE_DEFAULT,
    visibility: "public",
    invitedCreatorIds: [],
  };
}

/** A saved form draft (or an older shape): anything missing comes from the defaults. */
export function normalizeForm(data: Partial<PitchesForm> | undefined): PitchesForm {
  const base = defaultForm();
  const merged = { ...base, ...(data ?? {}), v: 2 as const };
  return {
    ...merged,
    usage: usageById[merged.usage] ? merged.usage : DEFAULT_USAGE,
    deadlineDays: isDeadline(merged.deadlineDays) ? merged.deadlineDays : ORDER_DEADLINE_DEFAULT,
    perVideo: { ...base.perVideo, ...(merged.perVideo ?? {}) },
  };
}

/** Switching product swaps product-derived fields, unless the brand already edited them. */
export function applyProduct(form: PitchesForm, next: Product, previous?: Product): PitchesForm {
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  const untouched = (value: string, prev?: string) => !value.trim() || value === prev;
  const untouchedList = (value: string[], prev?: string[]) => value.length === 0 || (prev ? same(value, prev) : false);
  return {
    ...form,
    productId: next.id,
    learningIds: next.learnings.map((l) => l.id),
    audience: untouched(form.audience, previous?.audience) ? next.audience : form.audience,
    keyMessage: untouched(form.keyMessage, previous?.oneLiner) ? next.oneLiner : form.keyMessage,
    mustInclude: untouchedList(form.mustInclude, previous?.dos) ? [...next.dos] : form.mustInclude,
    avoid: untouchedList(form.avoid, previous?.donts) ? [...next.donts] : form.avoid,
  };
}

/** Learnings already in a saved brief's must-include list come back as attached learnings. */
function splitLearnings(product: Product | undefined, mustInclude: string[]) {
  const texts = new Map((product?.learnings ?? []).map((l) => [l.text.trim().toLowerCase(), l.id]));
  const learningIds: string[] = [];
  const rest: string[] = [];
  for (const item of mustInclude) {
    const id = texts.get(item.trim().toLowerCase());
    if (id) learningIds.push(id);
    else rest.push(item);
  }
  return { learningIds, mustInclude: rest };
}

/** Form from a brief (saved draft order, earlier order or earlier job). */
function fromBrief(s: DemoState, brief: Brief, extra: Partial<PitchesForm>): PitchesForm {
  const product = s.products.find((p) => p.id === brief.productId);
  const base = defaultForm();
  const split = splitLearnings(product, brief.mustInclude ?? product?.dos ?? []);
  const adCopy = jobTypeOf({ brief }) === "ad-copy";
  return {
    ...base,
    productId: product ? product.id : "",
    learningIds: split.learningIds,
    jobType: adCopy ? "ad-copy" : "video",
    format: adCopy ? null : brief.format,
    copyPieces: [...(brief.copy?.pieces ?? [])],
    copyPlacements: brief.copy?.placements.length ? [...brief.copy.placements] : base.copyPlacements,
    videoCount: adCopy ? 1 : Math.min(VIDEO_COUNT_MAX, Math.max(1, brief.videoCount || 1)),
    durationSec: brief.durationSec || base.durationSec,
    aspect: brief.aspect ?? base.aspect,
    platforms: !adCopy && brief.platforms.length ? [...brief.platforms] : base.platforms,
    onCamera: adCopy ? base.onCamera : brief.onCamera,
    languages: brief.languages.length ? [...brief.languages] : base.languages,
    hook: brief.hook ?? "",
    attachments: [...(brief.attachments ?? [])],
    audience: brief.audience ?? product?.audience ?? "",
    goal: brief.goal ?? "",
    keyMessage: brief.keyMessage ?? product?.oneLiner ?? "",
    mustInclude: split.mustInclude,
    avoid: [...(brief.avoid ?? product?.donts ?? [])],
    references: [...(brief.references ?? [])],
    notes: brief.notes ?? "",
    usage: usageById[brief.usage] ? brief.usage : DEFAULT_USAGE,
    addons: adCopy ? [] : brief.addons.filter((id) => WANTED_ADDONS.includes(id)),
    ...extra,
  };
}

const perVideoOf = (budget: { min: number; max: number }, units: number) => ({
  min: Math.round(budget.min / units),
  max: Math.round(budget.max / units),
});

const unitsOfBrief = (brief: Brief) =>
  unitsFor({ jobType: jobTypeOf({ brief }), format: brief.format, videoCount: brief.videoCount });

export function formFromRequest(s: DemoState, request: ContentRequest): PitchesForm {
  const form = fromBrief(s, request.brief, {
    preferredKinds: [...request.preferredKinds],
    perVideo: perVideoOf(request.budget, unitsOfBrief(request.brief)),
    budgetTouched: true,
    deadlineDays: isDeadline(request.deadlineDays) ? request.deadlineDays! : ORDER_DEADLINE_DEFAULT,
    visibility: request.visibility,
    invitedCreatorIds: [...request.invitedCreatorIds],
    title: request.title,
  });
  const product = s.products.find((p) => p.id === form.productId);
  form.titleTouched = request.title !== autoTitle(form, product);
  return form;
}

/** "Order more like this" from a finished job: same brief, budget around what it cost. */
export function formFromCommission(s: DemoState, commission: Commission, selfId?: string): PitchesForm {
  const per = commission.price / unitsOfBrief(commission.brief);
  const form = fromBrief(s, commission.brief, {
    perVideo: { min: clampPrice(round10(per * 0.8)), max: clampPrice(round10(per * 1.2)) },
    budgetTouched: true,
    invitedCreatorIds: commission.creatorId !== selfId ? [commission.creatorId] : [],
    title: commission.title,
  });
  const product = s.products.find((p) => p.id === form.productId);
  form.titleTouched = commission.title !== autoTitle(form, product);
  return form;
}

/* -------------------------------------------------------------------------- */
/* Derived                                                                     */
/* -------------------------------------------------------------------------- */

/** Sensible "up to" lengths around the format's typical range. */
export function lengthOptions(format: FormatId | null): { value: number; longer: boolean }[] {
  const ladder = [5, 8, 10, 12, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300];
  if (!format) return [30, 45, 60, 90].map((value) => ({ value, longer: false }));
  const [lo, hi] = formatById[format].typical;
  const inside = ladder.filter((v) => v >= lo && v <= hi);
  const picked = inside.length > 4 ? [inside[0], ...inside.slice(-3)] : inside;
  const above = ladder.find((v) => v > hi);
  return [...picked.map((value) => ({ value, longer: false })), ...(above ? [{ value: above, longer: true }] : [])];
}

/** "3 videos", "5 hooks", "the copy". */
export const deliverableLabel = (form: UnitForm) =>
  isAdCopyForm(form) ? "the copy" : form.format === "hook-pack" ? plural(form.videoCount, "hook") : plural(form.videoCount, "video");

export const typicalLength = (format: FormatId) => {
  const [lo, hi] = formatById[format].typical;
  const label = (sec: number) => (sec < 60 ? `${sec}s` : lengthLabel(sec));
  return `${label(lo)}–${label(hi)}`;
};

/** "App demo for Daftar Invoices", "3 Spanish testimonials", "5 ad hooks for Roundleaf", "Ad copy for Brindle". */
export function autoTitle(
  form: Pick<PitchesForm, "jobType" | "format" | "languages" | "videoCount">,
  product?: Product,
): string {
  const forProduct = product ? ` for ${product.name}` : "";
  if (isAdCopyForm(form)) return `Ad copy${forProduct}`;
  if (!form.format) return product ? `New video for ${product.name}` : "";
  const other = form.languages.filter((l) => l !== DEFAULT_LANGUAGE);
  const language = other.length === 1 && form.languages.length === 1 ? `${languageById[other[0]].name} ` : "";
  let text: string;
  if (form.format === "hook-pack") text = `${form.videoCount} ${language}ad hooks${forProduct}`;
  else {
    const [one, many] = formatById[form.format].noun;
    const count = form.videoCount > 1 ? `${form.videoCount} ` : "";
    text = `${count}${language}${form.videoCount > 1 ? many : one}${forProduct}`;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const effectiveTitle = (form: PitchesForm, product?: Product) =>
  form.titleTouched ? form.title : autoTitle(form, product);

/** When an order posted now stops taking pitches (14 days). */
export const closesAtIfNow = () => addDays(NOW_ISO, ORDER_OPEN_DAYS);

/** The first version's due date if the brand hires today. */
export const firstVersionIfHiredToday = (deadlineDays: number) => at(deadlineDays, "18:00");

/** The latest a hired creator would deliver: the closing day plus the deadline (6 PM display time). */
export const dueDateFor = (deadlineDays: number) => at(ORDER_OPEN_DAYS + deadlineDays, "18:00");

/** The total budget the order stores (per video × videos, per pack × packs, or the job for ad copy). */
export function totalBudget(form: PitchesForm) {
  const units = unitsFor(form);
  return { min: form.perVideo.min * units, max: form.perVideo.max * units };
}

/** Attached learnings first, then the brand's own lines, without repeats. */
export function mergedMustInclude(form: PitchesForm, product?: Product): string[] {
  const learnings = (product?.learnings ?? []).filter((l) => form.learningIds.includes(l.id)).map((l) => l.text);
  const seen = new Set<string>();
  return [...form.mustInclude, ...learnings]
    .map((x) => x.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function formToBrief(form: PitchesForm, product?: Product): Brief {
  const adCopy = isAdCopyForm(form);
  return {
    productId: form.productId,
    jobType: form.jobType,
    format: adCopy ? "ad-copy" : (form.format ?? "app-demo"),
    platforms: adCopy ? [] : form.platforms,
    languages: form.languages.length ? form.languages : [DEFAULT_LANGUAGE],
    aspect: form.aspect,
    videoCount: adCopy ? 1 : form.videoCount,
    durationSec: adCopy ? 0 : form.durationSec,
    hook: form.hook.trim() || undefined,
    copy: adCopy ? { pieces: cleanLines(form.copyPieces), placements: form.copyPlacements } : undefined,
    attachments: form.attachments.length ? form.attachments : undefined,
    audience: form.audience.trim(),
    goal: form.goal.trim(),
    keyMessage: form.keyMessage.trim(),
    mustInclude: mergedMustInclude(form, product),
    avoid: cleanLines(form.avoid),
    references: form.references
      .map((r) => ({ ...r, label: r.label.trim(), note: r.note?.trim() || undefined }))
      .filter((r) => r.label),
    onCamera: adCopy ? false : form.onCamera,
    usage: form.usage,
    addons: adCopy ? [] : form.addons,
    notes: form.notes.trim() || undefined,
  };
}

/** What `actions.saveOrderDraft("custom", …)` keeps: the form itself, plus a title for lists. */
export function formToDraft(form: PitchesForm, step: number, product?: Product) {
  return { data: form, title: effectiveTitle(form, product).trim() || undefined, step };
}

export function formToRequest(form: PitchesForm, product?: Product): Omit<NewRequestInput, "status"> {
  return {
    title: effectiveTitle(form, product).trim(),
    brief: formToBrief(form, product),
    budget: totalBudget(form),
    deadlineDays: form.deadlineDays,
    visibility: form.visibility,
    invitedCreatorIds: form.invitedCreatorIds,
    preferredKinds: form.preferredKinds,
  };
}

/** A throwaway order so fit() and the preview can reason about an unposted brief. */
export function previewRequest(s: DemoState, form: PitchesForm, product?: Product): ContentRequest {
  return {
    id: "preview",
    businessId: activeIds(s).businessId,
    title: effectiveTitle(form, product) || "Your order",
    brief: formToBrief(form, product),
    budget: totalBudget(form),
    dueDate: dueDateFor(form.deadlineDays),
    postedAt: NOW_ISO,
    closesAt: closesAtIfNow(),
    status: "open",
    visibility: form.visibility,
    invitedCreatorIds: form.invitedCreatorIds,
    preferredKinds: form.preferredKinds,
    slots: 1,
    views: 0,
    kind: "custom",
    deadlineDays: form.deadlineDays,
  };
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export type FieldKey =
  | "product"
  | "format"
  | "copyPieces"
  | "copyPlacements"
  | "platforms"
  | "languages"
  | "hook"
  | "title"
  | "budget"
  | "deadline"
  | "usage"
  | "invites";

export const stepOfField: Record<FieldKey, number> = {
  product: 0,
  format: 1,
  copyPieces: 1,
  copyPlacements: 1,
  platforms: 1,
  languages: 1,
  hook: 1,
  title: 1,
  budget: 2,
  deadline: 2,
  usage: 2,
  invites: 2,
};

/** Why the budget isn't allowed, in words that say how to fix it; null when it's fine. */
export function budgetError(form: PitchesForm): string | null {
  const { min, max } = form.perVideo;
  const unit = unitWord(form);
  const each = perUnit(form);
  const units = unitsFor(form);
  // A pitch can't go under $30 a Yapp, and an order can't be under $50 in all.
  const floor = Math.max(PRICE_MIN_PER_YAPP, Math.ceil(BUDGET_MIN / units));
  if (!min) return `Add a minimum: at least ${money(floor)}${each}.`;
  if (!max) return "Add a maximum: the most you'd pay.";
  if (min < floor)
    return floor > PRICE_MIN_PER_YAPP
      ? `Orders start at ${money(BUDGET_MIN)}. Raise the minimum to at least ${money(floor)}${each}.`
      : `Raise the minimum to at least ${money(floor)}${each}: that's the lowest price on Yapp.`;
  if (max > PRICE_MAX_PER_YAPP)
    return `Lower the maximum to ${money(PRICE_MAX_PER_YAPP)}${each} or less: that's the most ${unit ? `a ${unit}` : "one order"} can cost on Yapp.`;
  if (max < min) return `Raise the maximum to at least the minimum (${money(min)}).`;
  return null;
}

export function validateStep(step: number, form: PitchesForm, product?: Product): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};
  const adCopy = isAdCopyForm(form);
  if (step === 0 && !product) errors.product = "Pick a product, or add one.";
  if (step === 1) {
    if (adCopy) {
      if (!cleanLines(form.copyPieces).length) errors.copyPieces = "Say what to write, one piece per line.";
      if (!form.copyPlacements.length) errors.copyPlacements = "Pick where the copy will run.";
      if (!form.languages.length) errors.languages = "Pick the language to write in.";
    } else {
      if (!form.format) errors.format = "Pick a format so creators know what to make.";
      if (!form.platforms.length) errors.platforms = "Pick at least one place you'll post it.";
      if (!form.languages.length) errors.languages = "Pick at least one language.";
    }
    if (form.hook.trim().length > HOOK_MAX) errors.hook = `Keep the hook under ${HOOK_MAX} characters.`;
    if ((adCopy || form.format) && effectiveTitle(form, product).trim().length < TITLE_MIN)
      errors.title = `Give it a title of at least ${TITLE_MIN} characters.`;
  }
  if (step === 2) {
    const budget = budgetError(form);
    if (budget) errors.budget = budget;
    if (!isDeadline(form.deadlineDays)) errors.deadline = "Pick how many days the creator has to deliver.";
    if (!usageById[form.usage]) errors.usage = "Choose how you'll use it.";
    if (form.visibility === "invite" && !form.invitedCreatorIds.length)
      errors.invites = "Invite at least one creator, or open it to everyone who matches.";
  }
  return errors;
}

export function firstInvalidStep(form: PitchesForm, product?: Product): number {
  for (let i = 0; i < STEPS.length; i++) if (Object.keys(validateStep(i, form, product)).length) return i;
  return -1;
}

/** "Help me write this": a first goal and key message from the product and format. */
export function draftCopy(format: FormatId | null, product: Product) {
  const id = format ?? "app-demo";
  const feature = (product.features[0] ?? product.oneLiner).replace(/\.$/, "");
  const cta = (product.cta || `Try ${product.name}`).replace(/\.$/, "");
  const goals: Record<FormatId, string> = {
    "app-demo": `Make ${product.name} feel like the obvious fix for a problem viewers have every week, show it working on a real phone, and end with: "${cta}".`,
    "screen-walkthrough": `Show, step by step, how to ${feature.charAt(0).toLowerCase()}${feature.slice(1)}, so a new user gets it right the first time. End with: "${cta}".`,
    unboxing: `Capture the first few minutes with ${product.name}: out of the box, set up with the app, and an honest first impression. End with: "${cta}".`,
    "problem-solution": `Open on a pain viewers recognize, then show ${product.name} fixing it in seconds. End with: "${cta}".`,
    comparison: `Put ${product.name} next to the way people do it today and let viewers see the difference for themselves. End with: "${cta}".`,
    testimonial: `Build trust with a real-feeling story of switching to ${product.name} and what changed, ending with: "${cta}".`,
    "talking-head": `Explain one thing ${product.name} does, straight to camera, so viewers can follow along and try it. End with: "${cta}".`,
    voiceover: `Tell a short story over ${product.name} footage that makes the product the turning point. End with: "${cta}".`,
    "hook-pack": `Find the opening that stops the scroll: several different hooks for one ad body about ${product.name}, ready for paid testing.`,
    "ad-copy": `Ads that make ${product.name} the obvious fix in one read, in the words customers already use, ending with: "${cta}".`,
  };
  const keyMessage = id === "screen-walkthrough" || id === "talking-head" ? `${feature}.` : product.oneLiner;
  return { goal: goals[id], keyMessage };
}

/* -------------------------------------------------------------------------- */
/* Market guidance (from the seeded creators' own packages)                    */
/* -------------------------------------------------------------------------- */

/**
 * What this creator would usually charge for `count` units of `durationSec`: the cheapest package
 * long enough, extra units at a 15% multi-video discount when the package holds fewer.
 */
export function quoteFor(creator: Creator, count: number, durationSec?: number) {
  const all = [...creator.packages].sort((a, b) => a.price - b.price);
  if (!all.length) return { price: 0, days: 7 };
  const longEnough = durationSec ? all.filter((p) => p.maxSeconds >= durationSec) : all;
  const options = (longEnough.length ? longEnough : all).map((p) => {
    if (p.videos >= count) return { price: p.price, days: p.deliveryDays };
    const extra = count - p.videos;
    const perVideo = p.price / Math.max(1, p.videos);
    return { price: round10(p.price + perVideo * extra * 0.85), days: p.deliveryDays + Math.ceil(extra / 2) };
  });
  return options.reduce((best, option) => (option.price < best.price ? option : best));
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export const median = (values: number[]) => quantile([...values].sort((a, b) => a - b), 0.5);

export type Market = {
  /** Creators who'd see the order (and, for video, what they'd usually quote). */
  pool: { creator: Creator; price: number; perUnit: number; days: number }[];
  count: number;
  /** Creators with a usual price for this (none for ad copy: no packages are priced for it yet). */
  quoted: number;
  /** Per video (per pack for hook packs). */
  low: number;
  high: number;
  perUnitPrices: number[];
  /** Usual days to a first version (0 when there are no quotes). */
  typicalDays: number;
  /** Creators whose usual price fits inside the maximum. */
  inBudget: number;
};

export function marketFor(s: DemoState, form: PitchesForm): Market {
  const adCopy = isAdCopyForm(form);
  const units = unitsFor(form);
  const self = activeIds(s).creatorId;
  const pool = s.creators
    .filter(
      (c) =>
        c.id !== self &&
        (adCopy || !form.format || c.formats.includes(form.format)) &&
        (form.languages.length === 0 || form.languages.some((l) => c.languages.includes(l))),
    )
    .map((creator) => {
      if (adCopy) return { creator, price: 0, perUnit: 0, days: 0 };
      const quote = quoteFor(creator, units, form.durationSec);
      return { creator, ...quote, perUnit: Math.round(quote.price / units) };
    })
    .filter((q) => adCopy || q.price > 0);
  const priced = pool.filter((q) => q.price > 0);
  const perUnitPrices = priced.map((q) => q.perUnit).sort((a, b) => a - b);
  const days = priced.map((q) => q.days).sort((a, b) => a - b);
  return {
    pool,
    count: pool.length,
    quoted: priced.length,
    low: clampPrice(round10(quantile(perUnitPrices, 0.25))),
    high: clampPrice(round10(quantile(perUnitPrices, 0.75))),
    perUnitPrices,
    typicalDays: Math.round(quantile(days, 0.5)),
    inBudget: priced.filter((q) => q.perUnit <= form.perVideo.max).length,
  };
}

/**
 * Creators to offer as invites, in a stable order (ticking one never moves the list): anyone
 * invited before this screen, past collaborators, saved creators, then the best fits. Never yourself.
 */
export function inviteCandidates(s: DemoState, form: PitchesForm, product?: Product, pinned: string[] = []) {
  const self = activeIds(s).creatorId;
  const temp = previewRequest(s, form, product);
  const savedIds = (s.saved[s.activeAccountId] ?? []).filter((id) => id !== self);
  const pastIds = s.commissions
    .filter((c) => c.businessId === activeIds(s).businessId && c.status === "completed" && c.creatorId !== self)
    .map((c) => c.creatorId);
  const byId = (id: string) => s.creators.find((c) => c.id === id && c.id !== self);
  type Candidate = { creator: Creator; fit: Fit; why: string };
  const out: Candidate[] = [];
  const add = (creator: Creator | undefined, why: string) => {
    if (!creator || out.some((x) => x.creator.id === creator.id)) return;
    out.push({ creator, fit: fit(s, creator, temp), why });
  };
  const past = new Set(pastIds);
  pinned.forEach((id) => add(byId(id), past.has(id) ? "Worked with you before" : "Picked from their profile"));
  [...past].forEach((id) => add(byId(id), "Worked with you before"));
  savedIds.forEach((id) => add(byId(id), "Saved"));
  if (out.length < 4) {
    s.creators
      .filter((c) => c.id !== self)
      .map((creator) => ({ creator, fit: fit(s, creator, temp) }))
      .sort((a, b) => b.fit.score - a.fit.score)
      .slice(0, 4)
      .forEach((x) => add(x.creator, "A strong fit"));
  }
  return out;
}

export const countLabel = (n: number, one: string, many = `${one}s`) => `${num(n)} ${n === 1 ? one : many}`;
