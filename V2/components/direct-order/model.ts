/**
 * Direct order (checkout for one creator): the editable draft, how it's prefilled (fresh, from a
 * package, from a previous commission, from a video that inspired it), derived totals and dates,
 * validation and the offer it sends. Pure; safe in render. Follows V1's checkout
 * (components/discovery/checkout/draft.ts); V2 also suggests the goal from the product.
 */

import { defaultPackage } from "@/components/new-order/helpers";
import { draftCopy } from "@/components/new-order/pitches-model";
import { at } from "@/lib/clock";
import { daysFromNow, lengthLabel, plural, priceBreakdown } from "@/lib/format";
import { isPersonal, me, productById } from "@/lib/selectors";
import type { DemoState, OfferInput } from "@/lib/store";
import { DEFAULT_LANGUAGE, DEFAULT_USAGE, formatById, languageById, usageById } from "@/lib/taxonomy";
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
  UsageOptionId,
  Video,
} from "@/lib/types";

export type Draft = {
  packageId: string;
  productId: string;
  /** Product learnings carried into this brief (added to must-include). */
  learningIds: string[];
  /** null = suggested (follows format and product). */
  title: string | null;
  format: FormatId;
  languages: LanguageId[];
  platforms: PlatformId[];
  aspect: Aspect;
  videoCount: number;
  durationSec: number;
  audience: string;
  /** null = suggested from the product and format. */
  goal: string | null;
  keyMessage: string;
  mustInclude: string[];
  avoid: string[];
  references: Reference[];
  onCamera: boolean;
  notes: string;
  /** How the brand may use the videos: one of four, included in the package price. */
  usage: UsageOptionId;
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
  return [...LENGTHS.filter((sec) => sec < pkg.maxSeconds), pkg.maxSeconds];
}

function snapLength(pkg: Package, seconds: number): number {
  const options = lengthOptions(pkg);
  const fitting = options.filter((sec) => sec <= seconds);
  return fitting.length ? fitting[fitting.length - 1] : options[0];
}

/** English when the creator makes videos in it (the default), otherwise their first language. */
const pickLanguage = (creator: Creator): LanguageId =>
  creator.languages.includes(DEFAULT_LANGUAGE) ? DEFAULT_LANGUAGE : (creator.languages[0] ?? DEFAULT_LANGUAGE);

const PLATFORM_PREFERENCE: PlatformId[] = ["tiktok", "instagram", "snapchat", "youtube"];

export const businessProducts = (s: DemoState): Product[] =>
  s.products.filter((p) => p.businessId === me.ids(s).businessId);

/** The reference a video from the feed or a portfolio adds to the brief. */
export const videoReference = (video: Video): Reference => ({ id: `rf-video-${video.id}`, label: `Like this one: ${video.title}` });

/** The brief fields a saved product fills in. */
export function fromProduct(product: Product | undefined) {
  if (!product)
    return { productId: "", audience: "", mustInclude: [], avoid: [], notes: "", keyMessage: "", learningIds: [], goal: null };
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
    goal: null,
  } satisfies Partial<Draft>;
}

export function initDraft(
  s: DemoState,
  creator: Creator,
  opts: { packageId?: string | null; repeat?: Commission | null; productId?: string | null; video?: Video | null },
): Draft {
  const products = businessProducts(s);
  const methods = me.paymentMethods(s);
  const paymentMethodId = methods.find((m) => m.isDefault)?.id ?? methods[0]?.id ?? "";
  const explicit = creator.packages.find((p) => p.id === opts.packageId);
  const chosenProduct = products.find((p) => p.id === opts.productId);
  const video = opts.video ?? null;
  const withVideo = (references: Reference[]) =>
    video && !references.some((r) => r.id === `rf-video-${video.id}`) ? [videoReference(video), ...references] : references;

  const repeat = opts.repeat;
  if (repeat) {
    const brief = repeat.brief;
    const pkg =
      explicit ??
      creator.packages.find((p) => p.id === repeat.packageId) ??
      creator.packages.find((p) => p.price === repeat.price) ??
      defaultPackage(creator);
    const product = chosenProduct ?? productById(s, brief.productId) ?? products[0];
    const languages = brief.languages.filter((l) => creator.languages.includes(l));
    // Learnings already in the old brief come back as attached learnings, not as plain lines.
    const learningTexts = new Set((product?.learnings ?? []).map((l) => l.text.trim().toLowerCase()));
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
      goal: brief.goal || null,
      keyMessage: brief.keyMessage,
      mustInclude: brief.mustInclude.filter((item) => !learningTexts.has(item.trim().toLowerCase())),
      avoid: [...brief.avoid],
      references: withVideo([...brief.references]),
      onCamera: brief.onCamera,
      notes: brief.notes ?? "",
      usage: usageById[brief.usage] ? brief.usage : DEFAULT_USAGE,
      addons: repeat.addons.map((a) => a.id).filter((id) => creator.addons.some((x) => x.id === id)),
      slack: 0,
      message: null,
      paymentMethodId: methods.some((m) => m.id === repeat.payment.methodId) ? repeat.payment.methodId : paymentMethodId,
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
    references: withVideo([]),
    onCamera: !formatById[format].voiceOnly,
    usage: DEFAULT_USAGE,
    addons: [],
    slack: 0,
    message: null,
    paymentMethodId,
  };
}

/** Changing package keeps the brief but resets what the package decides. */
export const withPackage = (d: Draft, pkg: Package): Draft => ({
  ...d,
  packageId: pkg.id,
  videoCount: pkg.videos,
  durationSec: snapLength(pkg, d.durationSec),
});

export function derive(s: DemoState, creator: Creator, d: Draft, repeat?: Commission | null) {
  const pkg = creator.packages.find((p) => p.id === d.packageId) ?? defaultPackage(creator);
  const product = productById(s, d.productId);
  const chosen = d.addons
    .map((id) => creator.addons.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  const addonPrices = chosen.map((a) => ({ id: a.id, price: a.price }));
  const addonDays = chosen.reduce((sum, a) => sum + (a.extraDays ?? 0), 0);
  const startOffset = !creator.available && creator.availableFrom ? Math.max(0, daysFromNow(creator.availableFrom)) : 0;
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
    d.title ?? (product ? `${format.name} for ${product.name}` : personal ? format.name : `${format.name} for ${business.name}`);
  const goal = d.goal ?? (product ? draftCopy(d.format, product).goal : "");
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
  return { pkg, product, chosen, addonPrices, addonDays, startOffset, workDays, earliest, dueDays, dueDate, revisions, totals, learnings, title, goal, message };
}

export type Derived = ReturnType<typeof derive>;

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export type FieldId = "product" | "title" | "format" | "languages" | "platforms" | "audience" | "goal" | "keyMessage" | "payment";

/** Fields that live behind the brief's "More details" disclosure (opened when one needs fixing). */
export const detailFields: FieldId[] = ["platforms", "audience"];

/** Short "what's missing" labels for the summary rail. */
export const fieldTodo: Record<FieldId, string> = {
  product: "Choose a product",
  title: "Add a title",
  format: "Pick a format",
  languages: "Pick a language",
  platforms: "Pick where you'll post it",
  audience: "Say who it's for",
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
  if (!d.platforms.length) errors.platforms = "Pick at least one place you'll post it.";
  if (d.audience.trim().length < 10) errors.audience = "Say who should watch it, in a sentence (at least 10 characters).";
  if (x.goal.trim().length < 10) errors.goal = "Say what viewers should do or feel after watching (at least 10 characters).";
  if (d.keyMessage.trim().length < 6) errors.keyMessage = "Add the one thing viewers should remember.";
  if (!me.paymentMethods(s).some((m) => m.id === d.paymentMethodId)) errors.payment = "Choose a card to authorize.";
  return errors;
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
    jobType: "video",
    format: d.format,
    platforms: d.platforms,
    languages: d.languages,
    aspect: d.aspect,
    videoCount: d.videoCount,
    durationSec: d.durationSec,
    audience: d.audience.trim(),
    goal: x.goal.trim(),
    keyMessage: d.keyMessage.trim(),
    mustInclude,
    avoid: d.avoid.map((a) => a.trim()).filter(Boolean),
    references: d.references,
    onCamera: d.onCamera,
    usage: d.usage,
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

export const deliverablesLabel = (d: Pick<Draft, "videoCount" | "durationSec">) =>
  `${plural(d.videoCount, "video")}, up to ${lengthLabel(d.durationSec)}`;
