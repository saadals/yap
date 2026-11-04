/**
 * Pure helpers for the business request flows: the wizard's form model, brief strength,
 * market guidance from real creator packages, and pitch sorting. Safe in render.
 */

import { HOUR, NOW, TZ_OFFSET, at } from "@/lib/clock";
import { daysFromNow, lengthLabel, plural } from "@/lib/format";
import { cityById, fit, type Fit } from "@/lib/selectors";
import { ME, type DemoState, type RequestDraft } from "@/lib/store";
import { formatById, languageById } from "@/lib/taxonomy";
import type {
  AddonId,
  Aspect,
  Brief,
  ContentRequest,
  Creator,
  CreatorKind,
  FormatId,
  LanguageId,
  Pitch,
  PlatformId,
  Product,
  Reference,
  Video,
} from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Wizard form                                                                 */
/* -------------------------------------------------------------------------- */

export type WizardForm = {
  productId: string;
  format: FormatId | null;
  videoCount: number;
  durationSec: number;
  aspect: Aspect;
  platforms: PlatformId[];
  onCamera: boolean;
  languages: LanguageId[];
  preferredKinds: CreatorKind[];
  title: string;
  /** False while the title still follows the automatic suggestion. */
  titleTouched: boolean;
  audience: string;
  goal: string;
  keyMessage: string;
  mustInclude: string[];
  avoid: string[];
  references: Reference[];
  notes: string;
  addons: AddonId[];
  budget: { min: number; max: number };
  /** False until the business moves the budget (we then suggest the market range). */
  budgetTouched: boolean;
  dueInDays: number;
  visibility: "public" | "invite";
  invitedCreatorIds: string[];
};

export const STEPS = [
  { key: "product", label: "Product", title: "Which product is this for?" },
  { key: "format", label: "Format", title: "What kind of video?" },
  { key: "deliverables", label: "Deliverables", title: "What should they deliver?" },
  { key: "language", label: "Language", title: "Who should speak?" },
  { key: "direction", label: "Direction", title: "Creative direction" },
  { key: "budget", label: "Budget", title: "Budget and timing" },
  { key: "who", label: "Who pitches", title: "Who can pitch?" },
  { key: "review", label: "Review", title: "Review and publish" },
] as const;

export const DEADLINE_PRESETS = [7, 10, 14, 21];
export const MIN_DEADLINE_DAYS = 3;
export const MAX_DEADLINE_DAYS = 90;
export const BUDGET_FLOOR = 50;
export const BUDGET_CEILING = 3000;

const countryDialect: Record<string, LanguageId> = {
  sa: "ar-saudi",
  ae: "ar-gulf",
  kw: "ar-gulf",
  qa: "ar-gulf",
  bh: "ar-gulf",
  om: "ar-gulf",
  eg: "ar-egyptian",
  jo: "ar-levantine",
  lb: "ar-levantine",
  iq: "ar-iraqi",
  ma: "ar-maghrebi",
};

/** The dialect most businesses in this city ask for (a starting point, always editable). */
export function homeDialect(s: DemoState): LanguageId {
  const business = s.businesses.find((b) => b.id === ME.businessId);
  const city = business ? cityById(business.cityId) : undefined;
  return (city && countryDialect[city.countryId]) || "ar-saudi";
}

export function defaultForm(s: DemoState, product?: Product): WizardForm {
  return {
    productId: product?.id ?? "",
    format: null,
    videoCount: 1,
    durationSec: 60,
    aspect: "9:16",
    platforms: ["tiktok", "instagram"],
    onCamera: true,
    languages: [homeDialect(s)],
    preferredKinds: [],
    title: "",
    titleTouched: false,
    audience: product?.audience ?? "",
    goal: "",
    keyMessage: "",
    mustInclude: product ? [...product.dos] : [],
    avoid: product ? [...product.donts] : [],
    references: [],
    notes: "",
    addons: [],
    budget: { min: 200, max: 400 },
    budgetTouched: false,
    dueInDays: 14,
    visibility: "public",
    invitedCreatorIds: [],
  };
}

/** Switching product swaps product-derived fields, unless the business already edited them. */
export function applyProduct(form: WizardForm, next: Product, previous?: Product): WizardForm {
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  const untouched = (value: string, prev?: string) => !value.trim() || value === prev;
  const untouchedList = (value: string[], prev?: string[]) =>
    value.length === 0 || (prev ? same(value, prev) : false);
  return {
    ...form,
    productId: next.id,
    audience: untouched(form.audience, previous?.audience) ? next.audience : form.audience,
    mustInclude: untouchedList(form.mustInclude, previous?.dos) ? [...next.dos] : form.mustInclude,
    avoid: untouchedList(form.avoid, previous?.donts) ? [...next.donts] : form.avoid,
  };
}

/** Sensible "max length" choices around the format's typical range. */
export function lengthOptions(format: FormatId | null): { value: number; longer: boolean }[] {
  const ladder = [5, 8, 10, 12, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300];
  if (!format) return [30, 45, 60, 90].map((value) => ({ value, longer: false }));
  const [lo, hi] = formatById[format].typical;
  const inside = ladder.filter((v) => v >= lo && v <= hi);
  const picked = inside.length > 4 ? [inside[0], ...inside.slice(-3)] : inside;
  const above = ladder.find((v) => v > hi);
  return [
    ...picked.map((value) => ({ value, longer: false })),
    ...(above ? [{ value: above, longer: true }] : []),
  ];
}

const formatPlural: Record<FormatId, [string, string]> = {
  "selfie-demo": ["selfie demo", "selfie demos"],
  "screen-walkthrough": ["screen walkthrough", "screen walkthroughs"],
  "ugc-review": ["honest review", "honest reviews"],
  "problem-skit": ["problem skit", "problem skits"],
  tutorial: ["how-to tutorial", "how-to tutorials"],
  "hook-pack": ["ad hook pack", "ad hook packs"],
};

/** For hook packs the count is hooks (one pack holds up to five); otherwise videos. */
export function deliverableLabel(format: FormatId | null, count: number): string {
  return format === "hook-pack" ? plural(count, "hook") : plural(count, "video");
}

/** "Saudi selfie demo for Daftar Invoices", "3 Khaleeji honest reviews", "5 Khaleeji ad hooks". */
export function autoTitle(form: WizardForm, product?: Product): string {
  if (!form.format) return product ? `New video for ${product.name}` : "";
  const arabic = form.languages.filter((l) => l !== "en");
  const dialect = arabic.length === 1 ? `${languageById[arabic[0]].short} ` : "";
  const forProduct = product ? ` for ${product.name}` : "";
  let text: string;
  if (form.format === "hook-pack") {
    text = `${form.videoCount} ${dialect}ad hooks${forProduct}`;
  } else {
    const [one, many] = formatPlural[form.format];
    const count = form.videoCount > 1 ? `${form.videoCount} ` : "";
    text = `${count}${dialect}${form.videoCount > 1 ? many : one}${forProduct}`;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const effectiveTitle = (form: WizardForm, product?: Product) =>
  form.titleTouched ? form.title : autoTitle(form, product);

/** Due timestamp (18:00 Riyadh) `days` from now; falls back to two weeks for an unset date. */
export function dueDateFor(days: number): string {
  return at(Number.isFinite(days) ? days : 14, "18:00");
}

/** yyyy-mm-dd (Riyadh) for a day offset, for <input type="date">. */
export function isoDay(dayOffset: number): string {
  return new Date(Date.parse(at(dayOffset, "12:00")) + TZ_OFFSET).toISOString().slice(0, 10);
}

/** Days from NOW for a yyyy-mm-dd value (Riyadh calendar). */
export function daysForIsoDay(value: string): number {
  const ms = Date.parse(`${value}T12:00:00.000Z`) - TZ_OFFSET;
  if (Number.isNaN(ms)) return NaN;
  return daysFromNow(new Date(ms).toISOString());
}

export function formToBrief(form: WizardForm): Brief {
  return {
    productId: form.productId,
    format: form.format ?? "selfie-demo",
    platforms: form.platforms,
    languages: form.languages,
    aspect: form.aspect,
    videoCount: form.videoCount,
    durationSec: form.durationSec,
    audience: form.audience.trim(),
    goal: form.goal.trim(),
    keyMessage: form.keyMessage.trim(),
    mustInclude: form.mustInclude.map((x) => x.trim()).filter(Boolean),
    avoid: form.avoid.map((x) => x.trim()).filter(Boolean),
    references: form.references
      .map((r) => ({ ...r, label: r.label.trim(), note: r.note?.trim() || undefined }))
      .filter((r) => r.label),
    onCamera: form.onCamera,
    addons: form.addons,
    notes: form.notes.trim() || undefined,
  };
}

export function formToDraft(
  form: WizardForm,
  step: number,
  product?: Product,
): Omit<RequestDraft, "savedAt"> {
  const brief: Partial<Brief> = { ...formToBrief(form) };
  if (!form.format) delete brief.format;
  return {
    step,
    title: effectiveTitle(form, product),
    brief,
    budget: form.budget,
    dueInDays: form.dueInDays,
    visibility: form.visibility,
    invitedCreatorIds: form.invitedCreatorIds,
    preferredKinds: form.preferredKinds,
  };
}

export function formFromDraft(s: DemoState, draft: RequestDraft): WizardForm {
  const product = s.products.find((p) => p.id === draft.brief.productId);
  const base = defaultForm(s);
  const b = draft.brief;
  const form: WizardForm = {
    ...base,
    productId: b.productId ?? "",
    format: b.format ?? null,
    videoCount: b.videoCount ?? base.videoCount,
    durationSec: b.durationSec ?? base.durationSec,
    aspect: b.aspect ?? base.aspect,
    platforms: b.platforms ?? base.platforms,
    onCamera: b.onCamera ?? base.onCamera,
    languages: b.languages ?? base.languages,
    preferredKinds: draft.preferredKinds,
    audience: b.audience ?? product?.audience ?? "",
    goal: b.goal ?? "",
    keyMessage: b.keyMessage ?? "",
    mustInclude: b.mustInclude ?? product?.dos ?? [],
    avoid: b.avoid ?? product?.donts ?? [],
    references: b.references ?? [],
    notes: b.notes ?? "",
    addons: b.addons ?? [],
    budget: draft.budget,
    budgetTouched: draft.step > 5,
    dueInDays: draft.dueInDays,
    visibility: draft.visibility,
    invitedCreatorIds: draft.invitedCreatorIds,
  };
  form.title = draft.title;
  form.titleTouched = Boolean(draft.title) && draft.title !== autoTitle(form, product);
  return form;
}

export function formFromRequest(s: DemoState, request: ContentRequest): WizardForm {
  const product = s.products.find((p) => p.id === request.brief.productId);
  const b = request.brief;
  const days = daysFromNow(request.dueDate);
  const form: WizardForm = {
    productId: b.productId,
    format: b.format,
    videoCount: b.videoCount,
    durationSec: b.durationSec,
    aspect: b.aspect,
    platforms: b.platforms,
    onCamera: b.onCamera,
    languages: b.languages,
    preferredKinds: request.preferredKinds,
    title: request.title,
    titleTouched: true,
    audience: b.audience,
    goal: b.goal,
    keyMessage: b.keyMessage,
    mustInclude: b.mustInclude,
    avoid: b.avoid,
    references: b.references,
    notes: b.notes ?? "",
    addons: b.addons,
    budget: request.budget,
    budgetTouched: true,
    dueInDays: days >= MIN_DEADLINE_DAYS ? days : 14,
    visibility: request.visibility,
    invitedCreatorIds: request.invitedCreatorIds,
  };
  form.titleTouched = request.title !== autoTitle(form, product);
  return form;
}

/** A throwaway request so fit() and the preview can reason about an unpublished brief. */
export function previewRequest(form: WizardForm, product?: Product): ContentRequest {
  return {
    id: "preview",
    businessId: ME.businessId,
    title: effectiveTitle(form, product) || "Your request",
    brief: formToBrief(form),
    budget: form.budget,
    dueDate: dueDateFor(form.dueInDays),
    postedAt: new Date(NOW).toISOString(),
    status: "open",
    visibility: form.visibility,
    invitedCreatorIds: form.invitedCreatorIds,
    preferredKinds: form.preferredKinds,
    slots: 1,
    views: 0,
  };
}

/** A real portfolio piece in this format, preferring the requested language and shared stats. */
export function exampleVideo(
  s: DemoState,
  format: FormatId | null,
  languages: LanguageId[],
): Video | undefined {
  if (!format) return undefined;
  const matches = s.videos.filter((v) => v.format === format);
  return (
    matches.find((v) => languages.includes(v.lang) && v.stats) ??
    matches.find((v) => languages.includes(v.lang)) ??
    matches.find((v) => v.stats) ??
    matches[0]
  );
}

export const typicalLength = (format: FormatId) => {
  const [lo, hi] = formatById[format].typical;
  const label = (sec: number) => (sec < 60 ? `${sec}s` : lengthLabel(sec));
  return `${label(lo)}–${label(hi)}`;
};

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export type FieldKey =
  | "product"
  | "format"
  | "platforms"
  | "languages"
  | "audience"
  | "goal"
  | "keyMessage"
  | "budget"
  | "deadline"
  | "invites"
  | "title";

export function validateStep(
  step: number,
  form: WizardForm,
  product?: Product,
): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};
  if (step === 0 && !product) errors.product = "Pick a product, or add one first.";
  if (step === 1 && !form.format) errors.format = "Pick a format so creators know what to make.";
  if (step === 2 && form.platforms.length === 0)
    errors.platforms = "Pick at least one platform you'll post on.";
  if (step === 3 && form.languages.length === 0)
    errors.languages = "Pick at least one language or dialect.";
  if (step === 4) {
    if (form.audience.trim().length < 10)
      errors.audience = "Describe who it's for in a sentence (at least 10 characters).";
    if (form.goal.trim().length < 10)
      errors.goal = "Say what viewers should do or feel after watching.";
    if (form.keyMessage.trim().length < 5) errors.keyMessage = "Add the one thing viewers should remember.";
  }
  if (step === 5) {
    if (form.budget.min < BUDGET_FLOOR)
      errors.budget = `The minimum budget is $${BUDGET_FLOOR}.`;
    else if (form.budget.max < form.budget.min)
      errors.budget = "The maximum must be at least the minimum.";
    if (
      !Number.isFinite(form.dueInDays) ||
      form.dueInDays < MIN_DEADLINE_DAYS ||
      form.dueInDays > MAX_DEADLINE_DAYS
    )
      errors.deadline = `Pick a date between ${MIN_DEADLINE_DAYS} and ${MAX_DEADLINE_DAYS} days from today.`;
  }
  if (step === 6 && form.visibility === "invite" && form.invitedCreatorIds.length === 0)
    errors.invites = "Invite at least one creator, or open it to everyone who fits.";
  if (step === 7 && effectiveTitle(form, product).trim().length < 6)
    errors.title = "Give it a title of at least 6 characters.";
  return errors;
}

export function firstInvalidStep(form: WizardForm, product?: Product): number {
  for (let i = 0; i < STEPS.length; i++) {
    if (Object.keys(validateStep(i, form, product)).length) return i;
  }
  return -1;
}

/* -------------------------------------------------------------------------- */
/* Brief strength (lavender = brief help)                                      */
/* -------------------------------------------------------------------------- */

export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export function briefStrength(form: WizardForm, product?: Product) {
  let score = 0;
  const tips: string[] = [];
  const audience = form.audience.trim();
  if (audience.length >= 20) score += 15;
  else tips.push("Add who it's for: age, where they live, what they do");

  if (form.goal.trim().length >= 15) score += 15;
  else tips.push("Say what viewers should do after watching");

  const words = wordCount(form.keyMessage);
  if (words > 0) {
    score += 10;
    if (words <= 15) score += 10;
    else tips.push(`Shorten the key message to under 15 words (now ${words})`);
  } else tips.push("Add a key message under 15 words");

  const must = form.mustInclude.filter((x) => x.trim()).length;
  if (must >= 1) score += 10;
  if (must >= 2) score += 5;
  else tips.push(must ? "Add one more must-include" : "Add at least two must-includes");

  if (form.avoid.some((x) => x.trim())) score += 10;
  else tips.push("Add one thing to avoid");

  if (form.references.some((r) => r.label.trim())) score += 10;
  else tips.push("Add one reference video or account you like");

  const learnings = product?.learnings ?? [];
  if (learnings.length) {
    const carried = learnings.some(
      (l) => form.mustInclude.includes(l.text) || form.avoid.includes(l.text),
    );
    if (carried) score += 10;
    else tips.push("Carry forward a learning from a past commission");
  } else if (form.notes.trim().length >= 10) score += 10;
  else tips.push("Add a note on tone, setting or what worked before");

  if (form.notes.trim().length >= 10 && learnings.length) score += 5;
  else if (!learnings.length && audience.length >= 20) score += 5;

  score = Math.min(100, score);
  const label =
    score >= 90 ? "Excellent" : score >= 70 ? "Strong" : score >= 40 ? "Getting there" : "Thin";
  return { score, tips, label };
}

/** "Help me write this": a sensible first draft from the product and format. */
export function draftCopy(form: WizardForm, product: Product) {
  const format = form.format ?? "selfie-demo";
  const feature = (product.features[0] ?? product.oneLiner).replace(/\.$/, "");
  const cta = product.cta.replace(/\.$/, "");
  const goals: Record<FormatId, string> = {
    "selfie-demo": `Make ${product.name} feel like the obvious fix for a problem viewers have every week, show it working on a real phone, and end with: "${cta}".`,
    "screen-walkthrough": `Show, step by step, how to ${feature.charAt(0).toLowerCase()}${feature.slice(1)}, so a new user gets it right on the first try. End with: "${cta}".`,
    "ugc-review": `Build trust with a real-feeling story of switching to ${product.name} and what changed, ending with: "${cta}".`,
    "problem-skit": `Make viewers laugh at a pain they recognise, then show ${product.name} fixing it in seconds. End with: "${cta}".`,
    tutorial: `Teach one complete workflow in ${product.name} so viewers can follow along and finish it themselves. End with: "${cta}".`,
    "hook-pack": `Find the opening that stops the scroll: several different hooks for one ad body about ${product.name}, ready for paid testing.`,
  };
  const keyMessages: Record<FormatId, string> = {
    "selfie-demo": product.oneLiner,
    "screen-walkthrough": `${feature}.`,
    "ugc-review": product.oneLiner,
    "problem-skit": product.oneLiner,
    tutorial: `${feature}.`,
    "hook-pack": product.oneLiner,
  };
  return { goal: goals[format], keyMessage: keyMessages[format] };
}

/* -------------------------------------------------------------------------- */
/* Market guidance (butter = money)                                            */
/* -------------------------------------------------------------------------- */

/**
 * What this creator would usually charge for `count` videos of `durationSec`, from their own
 * packages: the cheapest package that is long enough, with extra videos at a 15% multi-video
 * discount when the package holds fewer than requested.
 */
export function quoteFor(
  creator: Creator,
  count: number,
  durationSec?: number,
): { price: number; days: number } {
  const all = [...creator.packages].sort((a, b) => a.price - b.price);
  if (!all.length) return { price: 0, days: 7 };
  const longEnough = durationSec ? all.filter((p) => p.maxSeconds >= durationSec) : all;
  const options = (longEnough.length ? longEnough : all).map((p) => {
    if (p.videos >= count) return { price: p.price, days: p.deliveryDays };
    const extra = count - p.videos;
    const perVideo = p.price / Math.max(1, p.videos);
    return {
      price: Math.round((p.price + perVideo * extra * 0.85) / 10) * 10,
      days: p.deliveryDays + Math.ceil(extra / 2),
    };
  });
  return options.reduce((best, option) => (option.price < best.price ? option : best));
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const round10 = (n: number) => Math.round(n / 10) * 10;

export type Market = {
  pool: { creator: Creator; price: number; days: number }[];
  count: number;
  low: number;
  high: number;
  median: number;
  typicalDays: number;
  inBudget: number;
  prices: number[];
};

export function marketFor(
  s: DemoState,
  format: FormatId | null,
  languages: LanguageId[],
  videoCount: number,
  budget: { min: number; max: number },
  durationSec?: number,
): Market {
  // A hook pack holds up to five short hooks, so price it per pack rather than per hook.
  const units = format === "hook-pack" ? Math.ceil(videoCount / 5) : videoCount;
  const pool = s.creators
    .filter(
      (c) =>
        (!format || c.formats.includes(format)) &&
        (languages.length === 0 || languages.some((l) => c.languages.includes(l))),
    )
    .map((creator) => ({ creator, ...quoteFor(creator, units, durationSec) }))
    .filter((q) => q.price > 0);
  const prices = pool.map((q) => q.price).sort((a, b) => a - b);
  const days = pool.map((q) => q.days).sort((a, b) => a - b);
  return {
    pool,
    count: pool.length,
    low: round10(quantile(prices, 0.25)),
    high: round10(quantile(prices, 0.75)),
    median: round10(quantile(prices, 0.5)),
    typicalDays: Math.round(quantile(days, 0.5)) || 7,
    inBudget: pool.filter((q) => q.price <= budget.max).length,
    prices,
  };
}

/** Days a request realistically needs: first version plus one round of changes. */
export function recommendedDays(market: Market, videoCount: number, format: FormatId | null): number {
  return market.typicalDays + 3 + (videoCount > 3 && format !== "hook-pack" ? 2 : 0);
}

/* -------------------------------------------------------------------------- */
/* Pitches                                                                     */
/* -------------------------------------------------------------------------- */

export type PitchSort = "fit" | "price" | "fastest" | "newest";

export type RankedPitch = { pitch: Pitch; creator: Creator; fit: Fit };

export function rankPitches(
  s: DemoState,
  request: ContentRequest,
  pitches: Pitch[],
): RankedPitch[] {
  return pitches
    .map((pitch) => {
      const creator = s.creators.find((c) => c.id === pitch.creatorId);
      return creator ? { pitch, creator, fit: fit(s, creator, request) } : null;
    })
    .filter((x): x is RankedPitch => x !== null);
}

export function sortPitches(list: RankedPitch[], sort: PitchSort): RankedPitch[] {
  const copy = [...list];
  copy.sort((a, b) => {
    if (sort === "price") return a.pitch.price - b.pitch.price || b.fit.score - a.fit.score;
    if (sort === "fastest")
      return a.pitch.deliveryDays - b.pitch.deliveryDays || b.fit.score - a.fit.score;
    if (sort === "newest") return Date.parse(b.pitch.sentAt) - Date.parse(a.pitch.sentAt);
    return b.fit.score - a.fit.score || Date.parse(b.pitch.sentAt) - Date.parse(a.pitch.sentAt);
  });
  return copy;
}

/** Pitches that still need a decision from the business. */
export const isUndecided = (p: Pitch) => p.status === "sent" || p.status === "viewed";

/** "3h", "40 min", "1.5 days" */
export function durationLabel(ms: number): string {
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / 60000))} min`;
  const hours = ms / HOUR;
  if (hours < 36) return `${Math.round(hours)}h`;
  const days = Math.round((hours / 24) * 2) / 2;
  return `${Number.isInteger(days) ? days : days.toFixed(1)} days`;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return quantile(sorted, 0.5);
}

/** Is a request's brief complete enough to publish? */
export function briefComplete(request: ContentRequest): boolean {
  const b = request.brief;
  return Boolean(
    b.productId &&
      b.format &&
      b.platforms.length &&
      b.languages.length &&
      b.audience.trim().length >= 10 &&
      b.goal.trim().length >= 10 &&
      b.keyMessage.trim().length >= 5 &&
      request.title.trim().length >= 6 &&
      request.budget.max >= request.budget.min &&
      daysFromNow(request.dueDate) >= 1,
  );
}
