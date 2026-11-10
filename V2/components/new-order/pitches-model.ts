/**
 * The "Get pitches" flow (a custom request): its form, how it's prefilled (fresh, from a product,
 * an autosaved draft, a saved draft request, an earlier request or an earlier commission),
 * validation per step, market guidance from real creator packages, and the request it posts.
 * Pure; safe in render. Logic and limits follow V1's request wizard (components/requests/shared.ts).
 */

import { NOW, TZ_OFFSET, at } from "@/lib/clock";
import { daysFromNow, lengthLabel, money, num, plural } from "@/lib/format";
import { fit, type Fit } from "@/lib/selectors";
import { activeIds, type DemoState, type NewRequestInput, type RequestDraft } from "@/lib/store";
import { DEFAULT_LANGUAGE, PRICE_MAX_PER_YAPP, PRICE_MIN_PER_YAPP, formatById, languageById } from "@/lib/taxonomy";
import type {
  AddonId,
  Aspect,
  Brief,
  Commission,
  ContentRequest,
  Creator,
  CreatorKind,
  FormatId,
  LanguageId,
  PlatformId,
  Product,
  Reference,
} from "@/lib/types";

export type PitchesForm = {
  productId: string;
  /** The product's learnings attached to this brief (added to must-include when posting). */
  learningIds: string[];
  format: FormatId | null;
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
  audience: string;
  goal: string;
  keyMessage: string;
  mustInclude: string[];
  avoid: string[];
  references: Reference[];
  notes: string;
  addons: AddonId[];
  /** Budget per video (per pack for hook packs). The request stores the total. */
  perVideo: { min: number; max: number };
  /** False until the business sets the budget (we then suggest the market range). */
  budgetTouched: boolean;
  dueInDays: number;
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
  { key: "video", label: "The video", title: "What should creators make?", lead: undefined },
  {
    key: "terms",
    label: "Budget and timing",
    title: "Budget, timing and who can pitch",
    lead: "You pay nothing to post. Creators quote inside your range.",
  },
  { key: "review", label: "Review", title: "Check it and post", lead: "This is the brief creators will see." },
] as const;

export const DEADLINE_PRESETS = [7, 10, 14, 21];
export const MIN_DEADLINE_DAYS = 3;
export const MAX_DEADLINE_DAYS = 90;
/** The smallest budget an order can have (V1's rule), whatever the number of videos. */
export const BUDGET_FLOOR = 50;

/** Add-ons a business can ask creators to quote for. */
export const WANTED_ADDONS: AddonId[] = [
  "ad-rights-90",
  "ad-rights-365",
  "raw-footage",
  "subtitles",
  "rush",
  "extra-hooks",
  "post-to-account",
];

/** A hook pack holds up to five hooks and is priced as one pack; everything else per video. */
export const unitsFor = (format: FormatId | null, count: number) =>
  format === "hook-pack" ? Math.max(1, Math.ceil(count / 5)) : Math.max(1, count);
export const unitWord = (format: FormatId | null) => (format === "hook-pack" ? "pack" : "video");

const round10 = (n: number) => Math.round(n / 10) * 10;
const clampPrice = (n: number) => Math.min(PRICE_MAX_PER_YAPP, Math.max(PRICE_MIN_PER_YAPP, Math.round(n)));

/* -------------------------------------------------------------------------- */
/* Defaults and prefill                                                        */
/* -------------------------------------------------------------------------- */

export function defaultForm(product?: Product): PitchesForm {
  return {
    productId: product?.id ?? "",
    learningIds: product?.learnings.map((l) => l.id) ?? [],
    format: null,
    videoCount: 1,
    durationSec: 60,
    aspect: "9:16",
    platforms: ["tiktok", "instagram"],
    onCamera: true,
    languages: [DEFAULT_LANGUAGE],
    preferredKinds: [],
    title: "",
    titleTouched: false,
    audience: product?.audience ?? "",
    goal: "",
    keyMessage: product?.oneLiner ?? "",
    mustInclude: product ? [...product.dos] : [],
    avoid: product ? [...product.donts] : [],
    references: [],
    notes: "",
    addons: [],
    perVideo: { min: 150, max: 300 },
    budgetTouched: false,
    dueInDays: 14,
    visibility: "public",
    invitedCreatorIds: [],
  };
}

/** Switching product swaps product-derived fields, unless the business already edited them. */
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

/** Form from a brief (draft, saved draft request, earlier request or commission). */
function fromBrief(
  s: DemoState,
  brief: Partial<Brief>,
  extra: Partial<PitchesForm>,
): PitchesForm {
  const product = s.products.find((p) => p.id === brief.productId);
  const base = defaultForm();
  const split = splitLearnings(product, brief.mustInclude ?? product?.dos ?? []);
  return {
    ...base,
    productId: product ? product.id : "",
    learningIds: split.learningIds,
    format: brief.format ?? null,
    videoCount: brief.videoCount ?? base.videoCount,
    durationSec: brief.durationSec ?? base.durationSec,
    aspect: brief.aspect ?? base.aspect,
    platforms: brief.platforms?.length ? [...brief.platforms] : base.platforms,
    onCamera: brief.onCamera ?? base.onCamera,
    languages: brief.languages?.length ? [...brief.languages] : base.languages,
    audience: brief.audience ?? product?.audience ?? "",
    goal: brief.goal ?? "",
    keyMessage: brief.keyMessage ?? product?.oneLiner ?? "",
    mustInclude: split.mustInclude,
    avoid: [...(brief.avoid ?? product?.donts ?? [])],
    references: [...(brief.references ?? [])],
    notes: brief.notes ?? "",
    addons: [...(brief.addons ?? [])],
    ...extra,
  };
}

const perVideoOf = (budget: { min: number; max: number }, units: number) => ({
  min: Math.round(budget.min / units),
  max: Math.round(budget.max / units),
});

export function formFromDraft(s: DemoState, draft: RequestDraft): PitchesForm {
  const units = unitsFor(draft.brief.format ?? null, draft.brief.videoCount ?? 1);
  const form = fromBrief(s, draft.brief, {
    preferredKinds: draft.preferredKinds,
    perVideo: perVideoOf(draft.budget, units),
    budgetTouched: draft.step >= 2,
    dueInDays: draft.dueInDays,
    visibility: draft.visibility,
    invitedCreatorIds: draft.invitedCreatorIds,
  });
  const product = s.products.find((p) => p.id === form.productId);
  form.title = draft.title;
  form.titleTouched = Boolean(draft.title) && draft.title !== autoTitle(form, product);
  return form;
}

export function formFromRequest(s: DemoState, request: ContentRequest): PitchesForm {
  const units = unitsFor(request.brief.format, request.brief.videoCount);
  const days = daysFromNow(request.dueDate);
  const form = fromBrief(s, request.brief, {
    preferredKinds: request.preferredKinds,
    perVideo: perVideoOf(request.budget, units),
    budgetTouched: true,
    dueInDays: days >= MIN_DEADLINE_DAYS ? days : 14,
    visibility: request.visibility,
    invitedCreatorIds: [...request.invitedCreatorIds],
    title: request.title,
  });
  const product = s.products.find((p) => p.id === form.productId);
  form.titleTouched = request.title !== autoTitle(form, product);
  return form;
}

/** "Order more like this" from a finished commission: same brief, budget around what it cost. */
export function formFromCommission(s: DemoState, commission: Commission, selfId?: string): PitchesForm {
  const units = unitsFor(commission.brief.format, commission.brief.videoCount);
  const per = commission.price / units;
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

export const deliverableLabel = (format: FormatId | null, count: number) =>
  format === "hook-pack" ? plural(count, "hook") : plural(count, "video");

export const typicalLength = (format: FormatId) => {
  const [lo, hi] = formatById[format].typical;
  const label = (sec: number) => (sec < 60 ? `${sec}s` : lengthLabel(sec));
  return `${label(lo)}–${label(hi)}`;
};

/** "App demo for Daftar Invoices", "3 Spanish testimonials", "5 ad hooks for Roundleaf". */
export function autoTitle(form: Pick<PitchesForm, "format" | "languages" | "videoCount">, product?: Product): string {
  if (!form.format) return product ? `New video for ${product.name}` : "";
  const other = form.languages.filter((l) => l !== DEFAULT_LANGUAGE);
  const language = other.length === 1 && form.languages.length === 1 ? `${languageById[other[0]].name} ` : "";
  const forProduct = product ? ` for ${product.name}` : "";
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

/** Due timestamp (6 PM display time) `days` from now; two weeks for an unset date. */
export const dueDateFor = (days: number) => at(Number.isFinite(days) ? days : 14, "18:00");

/** yyyy-mm-dd (display time) for a day offset, for <input type="date">. */
export function isoDay(dayOffset: number): string {
  return new Date(Date.parse(at(dayOffset, "12:00")) + TZ_OFFSET).toISOString().slice(0, 10);
}

/** Days from NOW for a yyyy-mm-dd value (display-time calendar). */
export function daysForIsoDay(value: string): number {
  const ms = Date.parse(`${value}T12:00:00.000Z`) - TZ_OFFSET;
  if (Number.isNaN(ms)) return NaN;
  return daysFromNow(new Date(ms).toISOString());
}

/** The total budget the request stores (per video × videos, or per pack × packs). */
export function totalBudget(form: PitchesForm) {
  const units = unitsFor(form.format, form.videoCount);
  return { min: form.perVideo.min * units, max: form.perVideo.max * units };
}

/** Attached learnings first, then the business's own lines, without repeats. */
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
  return {
    productId: form.productId,
    format: form.format ?? "app-demo",
    platforms: form.platforms,
    languages: form.languages,
    aspect: form.aspect,
    videoCount: form.videoCount,
    durationSec: form.durationSec,
    audience: form.audience.trim(),
    goal: form.goal.trim(),
    keyMessage: form.keyMessage.trim(),
    mustInclude: mergedMustInclude(form, product),
    avoid: form.avoid.map((x) => x.trim()).filter(Boolean),
    references: form.references
      .map((r) => ({ ...r, label: r.label.trim(), note: r.note?.trim() || undefined }))
      .filter((r) => r.label),
    onCamera: form.onCamera,
    addons: form.addons,
    notes: form.notes.trim() || undefined,
  };
}

/** Autosave payload (requestDrafts). Step is 0–3 in V2. */
export function formToDraft(form: PitchesForm, step: number, product?: Product): Omit<RequestDraft, "savedAt"> {
  const brief: Partial<Brief> = { ...formToBrief(form, product) };
  if (!form.format) delete brief.format;
  return {
    step,
    title: effectiveTitle(form, product),
    brief,
    budget: totalBudget(form),
    dueInDays: form.dueInDays,
    visibility: form.visibility,
    invitedCreatorIds: form.invitedCreatorIds,
    preferredKinds: form.preferredKinds,
  };
}

export function formToRequest(form: PitchesForm, product?: Product): Omit<NewRequestInput, "status"> {
  return {
    title: effectiveTitle(form, product).trim(),
    brief: formToBrief(form, product),
    budget: totalBudget(form),
    dueDate: dueDateFor(form.dueInDays),
    visibility: form.visibility,
    invitedCreatorIds: form.invitedCreatorIds,
    preferredKinds: form.preferredKinds,
  };
}

/** A throwaway request so fit() and the preview can reason about an unposted brief. */
export function previewRequest(s: DemoState, form: PitchesForm, product?: Product): ContentRequest {
  return {
    id: "preview",
    businessId: activeIds(s).businessId,
    title: effectiveTitle(form, product) || "Your order",
    brief: formToBrief(form, product),
    budget: totalBudget(form),
    dueDate: dueDateFor(form.dueInDays),
    postedAt: new Date(NOW).toISOString(),
    status: "open",
    visibility: form.visibility,
    invitedCreatorIds: form.invitedCreatorIds,
    preferredKinds: form.preferredKinds,
    slots: 1,
    views: 0,
    kind: "custom",
  };
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export type FieldKey = "product" | "format" | "platforms" | "languages" | "title" | "budget" | "deadline" | "invites";

export const stepOfField: Record<FieldKey, number> = {
  product: 0,
  format: 1,
  platforms: 1,
  languages: 1,
  title: 1,
  budget: 2,
  deadline: 2,
  invites: 2,
};

/** Why the budget isn't allowed, in words that say how to fix it; null when it's fine. */
export function budgetError(form: PitchesForm): string | null {
  const { min, max } = form.perVideo;
  const unit = unitWord(form.format);
  const units = unitsFor(form.format, form.videoCount);
  if (!min) return `Add a minimum: at least ${money(PRICE_MIN_PER_YAPP)} a ${unit}.`;
  if (!max) return "Add a maximum: what you'd pay at most.";
  if (min < PRICE_MIN_PER_YAPP) return `Raise the minimum to at least ${money(PRICE_MIN_PER_YAPP)} a ${unit}.`;
  if (min * units < BUDGET_FLOOR)
    return `Orders start at ${money(BUDGET_FLOOR)}. Raise the minimum to at least ${money(Math.ceil(BUDGET_FLOOR / units))}.`;
  if (max > PRICE_MAX_PER_YAPP) return `Lower the maximum to ${money(PRICE_MAX_PER_YAPP)} or less: that's the most a ${unit} can cost on Yapp.`;
  if (max < min) return `Raise the maximum to at least the minimum (${money(min)}).`;
  return null;
}

export function validateStep(step: number, form: PitchesForm, product?: Product): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};
  if (step === 0 && !product) errors.product = "Pick a product, or add one.";
  if (step === 1) {
    if (!form.format) errors.format = "Pick a format so creators know what to make.";
    if (!form.platforms.length) errors.platforms = "Pick at least one place you'll post it.";
    if (!form.languages.length) errors.languages = "Pick at least one language.";
    if (form.format && effectiveTitle(form, product).trim().length < 6)
      errors.title = "Give it a title of at least 6 characters.";
  }
  if (step === 2) {
    const budget = budgetError(form);
    if (budget) errors.budget = budget;
    if (!Number.isFinite(form.dueInDays) || form.dueInDays < MIN_DEADLINE_DAYS || form.dueInDays > MAX_DEADLINE_DAYS)
      errors.deadline = `Pick a date between ${MIN_DEADLINE_DAYS} and ${MAX_DEADLINE_DAYS} days from today.`;
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
  pool: { creator: Creator; price: number; perUnit: number; days: number }[];
  count: number;
  /** Per video (per pack for hook packs). */
  low: number;
  high: number;
  perUnitPrices: number[];
  typicalDays: number;
  /** Creators whose usual price fits inside the maximum. */
  inBudget: number;
};

export function marketFor(s: DemoState, form: PitchesForm): Market {
  const units = unitsFor(form.format, form.videoCount);
  const self = activeIds(s).creatorId;
  const pool = s.creators
    .filter(
      (c) =>
        c.id !== self &&
        (!form.format || c.formats.includes(form.format)) &&
        (form.languages.length === 0 || form.languages.some((l) => c.languages.includes(l))),
    )
    .map((creator) => {
      const quote = quoteFor(creator, units, form.durationSec);
      return { creator, ...quote, perUnit: Math.round(quote.price / units) };
    })
    .filter((q) => q.price > 0);
  const perUnitPrices = pool.map((q) => q.perUnit).sort((a, b) => a - b);
  const days = pool.map((q) => q.days).sort((a, b) => a - b);
  return {
    pool,
    count: pool.length,
    low: clampPrice(round10(quantile(perUnitPrices, 0.25))),
    high: clampPrice(round10(quantile(perUnitPrices, 0.75))),
    perUnitPrices,
    typicalDays: Math.round(quantile(days, 0.5)) || 7,
    inBudget: pool.filter((q) => q.perUnit <= form.perVideo.max).length,
  };
}

/** Days a request realistically needs: first version plus one round of changes. */
export const recommendedDays = (market: Market, form: PitchesForm) =>
  market.typicalDays + 3 + (form.videoCount > 3 && form.format !== "hook-pack" ? 2 : 0);

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
