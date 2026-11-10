/**
 * Direct-commission checkout: the editable draft, how it's prefilled (fresh, from a package, or
 * from a previous commission), derived totals/dates, validation and the final offer input.
 * Pure; safe in render.
 */

import { at } from "@/lib/clock";
import { daysFromNow, lengthLabel, plural, priceBreakdown, weekdayDate } from "@/lib/format";
import { isPersonal, me, productById } from "@/lib/selectors";
import type { DemoState, OfferInput } from "@/lib/store";
import { DEFAULT_LANGUAGE, formatById, languageById } from "@/lib/taxonomy";
import type {
  AddonId,
  Aspect,
  Brief,
  Commission,
  Creator,
  FormatId,
  LanguageId,
  Package,
  PlatformId,
  Product,
  Reference,
  Video,
} from "@/lib/types";

import { defaultPackage } from "../profile-utils";

export type Draft = {
  packageId: string;
  productId: string;
  /** Product learnings to carry into this brief. */
  learningIds: string[];
  /** null = suggested title (follows format + product). */
  title: string | null;
  format: FormatId;
  languages: LanguageId[];
  platforms: PlatformId[];
  aspect: Aspect;
  videoCount: number;
  durationSec: number;
  audience: string;
  goal: string;
  keyMessage: string;
  mustInclude: string[];
  avoid: string[];
  references: Reference[];
  onCamera: boolean;
  notes: string;
  addons: AddonId[];
  /** Extra days on top of the earliest possible due date. */
  slack: number;
  /** null = suggested message. */
  message: string | null;
  paymentMethodId: string;
};

export const SLACK_OPTIONS = [
  { value: 0, label: "Fastest" },
  { value: 2, label: "A little slack" },
  { value: 5, label: "No rush" },
];

const LENGTHS = [15, 30, 45, 60, 90, 120, 180];

export function lengthOptions(pkg: Package): number[] {
  const list = LENGTHS.filter((s) => s < pkg.maxSeconds);
  return [...list, pkg.maxSeconds];
}

function snapLength(pkg: Package, seconds: number): number {
  const options = lengthOptions(pkg);
  const fitting = options.filter((s) => s <= seconds);
  return fitting.length ? fitting[fitting.length - 1] : options[0];
}

/** English when the creator makes videos in it (the default), otherwise their first language. */
function pickLanguage(creator: Creator): LanguageId {
  return creator.languages.includes(DEFAULT_LANGUAGE) ? DEFAULT_LANGUAGE : (creator.languages[0] ?? DEFAULT_LANGUAGE);
}

const PLATFORM_PREFERENCE: PlatformId[] = ["tiktok", "instagram", "snapchat", "youtube"];

/** Saved products of the signed-in account's buyer profile. */
export function businessProducts(s: DemoState): Product[] {
  const businessId = me.ids(s).businessId;
  return s.products.filter((p) => p.businessId === businessId);
}

/** The reference a video from the feed (or a portfolio) adds to the brief. */
export const videoReference = (video: Video): Reference => ({
  id: `rf-video-${video.id}`,
  label: `Like this one: ${video.title}`,
});

/** The brief fields a saved product fills in. */
export function fromProduct(product: Product | undefined): Pick<
  Draft,
  "productId" | "audience" | "mustInclude" | "avoid" | "notes" | "keyMessage" | "learningIds"
> {
  if (!product)
    return { productId: "", audience: "", mustInclude: [], avoid: [], notes: "", keyMessage: "", learningIds: [] };
  const tone = product.tone.length ? `Tone: ${product.tone.join(", ").toLowerCase()}.` : "";
  const cta = product.cta ? ` End with: “${product.cta}”.` : "";
  return {
    productId: product.id,
    audience: product.audience,
    mustInclude: [...product.dos],
    avoid: [...product.donts],
    notes: `${tone}${cta}`.trim(),
    keyMessage: product.oneLiner,
    learningIds: product.learnings.map((l) => l.id),
  };
}

export function initDraft(
  s: DemoState,
  creator: Creator,
  opts: {
    packageId?: string | null;
    repeat?: Commission | null;
    /** Preselect this saved product (must belong to the signed-in account). */
    productId?: string | null;
    /** Add this video as a "like this one" reference (and use its format when offered). */
    video?: Video | null;
  },
): Draft {
  const products = businessProducts(s);
  const methods = me.paymentMethods(s);
  const paymentMethodId = methods.find((m) => m.isDefault)?.id ?? methods[0]?.id ?? "";
  const explicit = creator.packages.find((p) => p.id === opts.packageId);
  const chosenProduct = products.find((p) => p.id === opts.productId);
  const repeat = opts.repeat;
  const video = opts.video ?? null;
  const withVideo = (references: Reference[]) =>
    video && !references.some((r) => r.id === `rf-video-${video.id}`)
      ? [videoReference(video), ...references]
      : references;

  if (repeat) {
    const brief = repeat.brief;
    const pkg =
      explicit ??
      creator.packages.find((p) => p.id === repeat.packageId) ??
      creator.packages.find((p) => p.price === repeat.price) ??
      defaultPackage(creator);
    const product = chosenProduct ?? productById(s, brief.productId) ?? products[0];
    const languages = brief.languages.filter((l) => creator.languages.includes(l));
    return {
      packageId: pkg.id,
      productId: product?.id ?? "",
      learningIds: product?.learnings.map((l) => l.id) ?? [],
      title: repeat.title,
      format: creator.formats.includes(brief.format) ? brief.format : creator.formats[0],
      languages: languages.length ? languages : [pickLanguage(creator)],
      platforms: brief.platforms.length ? [...brief.platforms] : ["tiktok", "instagram"],
      aspect: brief.aspect,
      videoCount: Math.max(1, Math.min(brief.videoCount, pkg.videos)),
      durationSec: snapLength(pkg, brief.durationSec),
      audience: brief.audience,
      goal: brief.goal,
      keyMessage: brief.keyMessage,
      mustInclude: [...brief.mustInclude],
      avoid: [...brief.avoid],
      references: withVideo([...brief.references]),
      onCamera: brief.onCamera,
      notes: brief.notes ?? "",
      addons: repeat.addons.map((a) => a.id).filter((id) => creator.addons.some((x) => x.id === id)),
      slack: 0,
      message: null,
      paymentMethodId: methods.some((m) => m.id === repeat.payment.methodId)
        ? repeat.payment.methodId
        : paymentMethodId,
    };
  }

  const pkg = explicit ?? defaultPackage(creator);
  const format = video && creator.formats.includes(video.format) ? video.format : creator.formats[0];
  const platforms = PLATFORM_PREFERENCE.filter((p) => creator.platforms.includes(p)).slice(0, 3);
  const language = video && creator.languages.includes(video.lang) ? video.lang : pickLanguage(creator);
  return {
    packageId: pkg.id,
    ...fromProduct(chosenProduct ?? products[0]),
    title: null,
    format,
    languages: [language],
    platforms: platforms.length ? platforms : ["tiktok", "instagram"],
    aspect: "9:16",
    videoCount: pkg.videos,
    durationSec: snapLength(pkg, formatById[format].typical[1]),
    goal: "",
    references: withVideo([]),
    onCamera: !formatById[format].voiceOnly,
    addons: [],
    slack: 0,
    message: null,
    paymentMethodId,
  };
}

/** Changing package keeps the brief but resets what the package decides. */
export function withPackage(d: Draft, pkg: Package): Draft {
  return { ...d, packageId: pkg.id, videoCount: pkg.videos, durationSec: snapLength(pkg, d.durationSec) };
}

/* -------------------------------------------------------------------------- */
/* Derived                                                                     */
/* -------------------------------------------------------------------------- */

export function derive(s: DemoState, creator: Creator, d: Draft, repeat?: Commission | null) {
  const pkg = creator.packages.find((p) => p.id === d.packageId) ?? defaultPackage(creator);
  const product = productById(s, d.productId);
  const chosen = d.addons
    .map((id) => creator.addons.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  const addonPrices = chosen.map((a) => ({ id: a.id, price: a.price }));
  const addonDays = chosen.reduce((sum, a) => sum + (a.extraDays ?? 0), 0);
  const startOffset =
    !creator.available && creator.availableFrom ? Math.max(0, daysFromNow(creator.availableFrom)) : 0;
  const workDays = Math.max(1, pkg.deliveryDays + addonDays);
  const earliest = workDays + startOffset;
  const dueDays = earliest + d.slack;
  const dueDate = at(dueDays, "18:00");
  const revisions = pkg.revisions + (d.addons.includes("extra-revision") ? 1 : 0);
  const totals = priceBreakdown(pkg.price, addonPrices);
  const learnings = product?.learnings.filter((l) => d.learningIds.includes(l.id)) ?? [];
  const format = formatById[d.format];
  const business = me.business(s);
  // Personal buyer profiles order in their own name ("I"), companies as a team ("we").
  const personal = isPersonal(s, business.id);
  const title =
    d.title ??
    (product ? `${format.name} for ${product.name}` : personal ? format.name : `${format.name} for ${business.name}`);
  const sender = (me.member(s)?.name ?? me.account(s).name).split(" ")[0];
  const spoken = d.languages.map((l) => languageById[l].name).join(" and ");
  const noun = format.noun[0];
  const what = `${/^[aeiou]/.test(noun) ? "an" : "a"} ${noun}${product ? ` for ${product.name}` : personal ? "" : " for our app"}${spoken ? ` in ${spoken}` : ""}`;
  const message =
    d.message ??
    (repeat
      ? personal
        ? `Hi ${creator.firstName}, back for another video. This builds on “${repeat.title}” and includes what I learned from it${learnings.length ? ` (${plural(learnings.length, "note")} in the must-include list)` : ""}. Shout if anything's unclear.`
        : `Hi ${creator.firstName}, same team, new video. This builds on “${repeat.title}” and includes what we learned from it${learnings.length ? ` (${plural(learnings.length, "note")} in the must-include list)` : ""}. Shout if anything's unclear.`
      : personal
        ? `Hi ${creator.firstName}, I'm ${sender}. I'd love ${what}. The brief is below, and I'm happy to answer any questions before you start.`
        : `Hi ${creator.firstName}, I'm ${sender} from ${business.name}. We'd love ${what}. The brief and our product notes are below, and I'm happy to answer any questions before you start.`);
  return {
    pkg,
    product,
    chosen,
    addonPrices,
    addonDays,
    startOffset,
    workDays,
    earliest,
    dueDays,
    dueDate,
    revisions,
    totals,
    learnings,
    title,
    message,
  };
}

export type Derived = ReturnType<typeof derive>;

export function dueOption(earliest: number, slack: number) {
  const days = earliest + slack;
  return { days, date: weekdayDate(at(days, "18:00")) };
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export type FieldId =
  | "product"
  | "title"
  | "format"
  | "languages"
  | "platforms"
  | "audience"
  | "goal"
  | "keyMessage"
  | "payment";

export type SectionId = "package" | "product" | "brief" | "addons" | "timing" | "message" | "payment";

export const fieldSection: Record<FieldId, SectionId> = {
  product: "product",
  title: "brief",
  format: "brief",
  languages: "brief",
  platforms: "brief",
  audience: "brief",
  goal: "brief",
  keyMessage: "brief",
  payment: "payment",
};

/** Short "what's missing" labels for the submit area. */
export const fieldTodo: Record<FieldId, string> = {
  product: "Choose a product",
  title: "Add a title",
  format: "Pick a format",
  languages: "Pick a language",
  platforms: "Pick a platform",
  audience: "Describe the audience",
  goal: "Write the goal",
  keyMessage: "Add the key message",
  payment: "Choose how to pay",
};

export function validate(s: DemoState, creator: Creator, d: Draft, x: Derived): Partial<Record<FieldId, string>> {
  const errors: Partial<Record<FieldId, string>> = {};
  // A product is only required once the account has saved one (personal buyers may have none).
  if (!x.product && businessProducts(s).length) errors.product = "Choose which product this video is for.";
  if (x.title.trim().length < 4) errors.title = "Give it a short title so you can find it later.";
  if (!creator.formats.includes(d.format)) errors.format = `${creator.firstName} doesn't offer this format. Pick one of theirs.`;
  if (!d.languages.length) errors.languages = "Pick at least one language.";
  if (!d.platforms.length) errors.platforms = "Pick at least one platform you'll post on.";
  if (d.audience.trim().length < 10) errors.audience = "Describe who should watch it, in a sentence or two.";
  if (d.goal.trim().length < 10) errors.goal = "Say what viewers should do or feel after watching.";
  if (d.keyMessage.trim().length < 6) errors.keyMessage = "Add the one thing viewers should remember.";
  if (!me.paymentMethods(s).some((m) => m.id === d.paymentMethodId)) errors.payment = "Choose a card to authorize.";
  return errors;
}

/* -------------------------------------------------------------------------- */
/* Brief strength (lavender hint)                                              */
/* -------------------------------------------------------------------------- */

export function briefStrength(d: Draft, x: Derived) {
  const checks = [
    { ok: d.goal.trim().length >= 20, tip: "Write the goal as a full sentence: who does what after watching." },
    { ok: d.keyMessage.trim().length >= 6, tip: "Add a key message viewers should remember." },
    { ok: d.mustInclude.length + x.learnings.length >= 2, tip: "List at least two things the video must show." },
    { ok: d.avoid.length >= 1, tip: "Add one thing to avoid. It saves a revision round." },
    { ok: d.references.length >= 1, tip: "Add a reference video so the tone is easy to match." },
    { ok: x.learnings.length >= 1 || d.notes.trim().length >= 20, tip: "Add notes on setting, props or anything you've learned works." },
  ];
  const score = checks.filter((c) => c.ok).length;
  const label = score >= 5 ? "Strong" : score >= 3 ? "Good" : "Getting there";
  return { score, total: checks.length, label, tips: checks.filter((c) => !c.ok).map((c) => c.tip).slice(0, 2) };
}

/* -------------------------------------------------------------------------- */
/* Offer                                                                       */
/* -------------------------------------------------------------------------- */

export function toOffer(creator: Creator, d: Draft, x: Derived, repeat?: Commission | null): OfferInput {
  const seen = new Set<string>();
  const mustInclude = [...d.mustInclude, ...x.learnings.map((l) => l.text)].filter((item) => {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const brief: Brief = {
    productId: d.productId,
    format: d.format,
    platforms: d.platforms,
    languages: d.languages,
    aspect: d.aspect,
    videoCount: d.videoCount,
    durationSec: d.durationSec,
    audience: d.audience.trim(),
    goal: d.goal.trim(),
    keyMessage: d.keyMessage.trim(),
    mustInclude,
    avoid: d.avoid,
    references: d.references,
    onCamera: d.onCamera,
    addons: d.addons,
    notes: d.notes.trim() || undefined,
  };
  return {
    creatorId: creator.id,
    packageId: x.pkg.id,
    title: x.title.trim(),
    brief,
    price: x.pkg.price,
    addons: x.addonPrices,
    revisionsIncluded: x.revisions,
    dueDate: x.dueDate,
    message: x.message.trim(),
    paymentMethodId: d.paymentMethodId,
    previousCommissionId: repeat?.id,
  };
}

export const deliverablesLabel = (d: Draft) =>
  `${d.videoCount} video${d.videoCount === 1 ? "" : "s"} · up to ${lengthLabel(d.durationSec)}`;
