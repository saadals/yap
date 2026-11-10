"use client";

import { useState } from "react";

import { money, priceLimitError } from "@/lib/format";
import { portfolio } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { addons, formats, languages, niches } from "@/lib/taxonomy";
import type { AddonId, Creator, CreatorAddon, CreatorKind, FormatId, LanguageId, NicheId, Package, PackageTier } from "@/lib/types";

/**
 * The profile editor's draft: every field that saves with "Save changes" (profile, packages,
 * add-ons, equipment). Portfolio, connected accounts and availability are actions that save as
 * you go, so they read the store directly.
 */
export type AddonDraft = { on: boolean; price: number; extraDays: number };

export type ProfileDraft = {
  headline: string;
  bio: string;
  cityId: string;
  kind: CreatorKind;
  languages: LanguageId[];
  formats: FormatId[];
  niches: NicheId[];
  /** The tiers offered, in tier order. Basic is always there. */
  packages: Package[];
  addons: Record<AddonId, AddonDraft>;
  equipment: string[];
};

export const HEADLINE_MIN = 10;
export const HEADLINE_MAX = 60;
export const BIO_MIN = 80;
export const BIO_MAX = 400;

export const TIERS: { id: PackageTier; label: string; hint: string }[] = [
  { id: "basic", label: "Basic", hint: "Your entry point. Most first-time brands start here." },
  { id: "standard", label: "Standard", hint: "The one you'd recommend. Usually the most booked." },
  { id: "premium", label: "Premium", hint: "More videos or more polish, for bigger launches." },
];
export const tierLabel = (tier: PackageTier) => TIERS.find((t) => t.id === tier)?.label ?? tier;

/** Starting prices when an add-on is first switched on. */
export const SUGGESTED_ADDONS: Record<AddonId, { price: number; extraDays: number }> = {
  "extra-revision": { price: 35, extraDays: 1 },
  "raw-footage": { price: 50, extraDays: 0 },
  subtitles: { price: 40, extraDays: 0 },
  "ad-rights-90": { price: 90, extraDays: 0 },
  "ad-rights-365": { price: 220, extraDays: 0 },
  rush: { price: 80, extraDays: -2 },
  "extra-hooks": { price: 60, extraDays: 1 },
  "post-to-account": { price: 150, extraDays: 0 },
};

const inOrder = <T extends string>(order: T[], picked: T[]) => order.filter((id) => picked.includes(id));
const languageOrder = languages.map((l) => l.id);
const formatOrder = formats.map((f) => f.id);
const nicheOrder = niches.map((n) => n.id);

/** Toggle a value in a list, keeping the taxonomy's order (so on-then-off is no change). */
export function toggleIn<T extends string>(order: T[], list: T[], value: T): T[] {
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  return inOrder(order, next);
}
export const orders = { languages: languageOrder, formats: formatOrder, niches: nicheOrder };

export function draftFrom(creator: Creator): ProfileDraft {
  const tierIndex = (tier: PackageTier) => TIERS.findIndex((t) => t.id === tier);
  return {
    headline: creator.headline,
    bio: creator.bio,
    cityId: creator.cityId,
    kind: creator.kind,
    languages: inOrder(languageOrder, creator.languages),
    formats: inOrder(formatOrder, creator.formats),
    niches: inOrder(nicheOrder, creator.niches),
    packages: [...creator.packages].sort((a, b) => tierIndex(a.tier) - tierIndex(b.tier)),
    addons: Object.fromEntries(
      addons.map((a) => {
        const mine = creator.addons.find((x) => x.id === a.id);
        return [
          a.id,
          mine
            ? { on: true, price: mine.price, extraDays: mine.extraDays ?? 0 }
            : { on: false, ...SUGGESTED_ADDONS[a.id] },
        ];
      }),
    ) as Record<AddonId, AddonDraft>,
    equipment: [...creator.equipment],
  };
}

/** What "Save changes" writes with `actions.updateCreator`. */
export function patchFrom(draft: ProfileDraft): Partial<Creator> {
  return {
    headline: draft.headline.trim(),
    bio: draft.bio.trim(),
    cityId: draft.cityId,
    kind: draft.kind,
    languages: draft.languages,
    formats: draft.formats,
    niches: draft.niches,
    packages: draft.packages.map((p) => ({
      ...p,
      name: p.name.trim(),
      summary: p.summary.trim(),
      includes: p.includes.map((item) => item.trim()).filter(Boolean),
    })),
    addons: addons
      .filter((a) => draft.addons[a.id].on)
      .map((a): CreatorAddon => {
        const row = draft.addons[a.id];
        return { id: a.id, price: row.price, ...(row.extraDays ? { extraDays: row.extraDays } : {}) };
      }),
    equipment: draft.equipment,
  };
}

/** A new tier, shaped like the one below it (name, price and what's included left to fill in). */
export function newPackage(creator: Creator, tier: PackageTier, below?: Package): Package {
  return {
    id: `pk-${creator.firstName.toLowerCase()}-${tier}`,
    tier,
    name: "",
    summary: "",
    price: Number.NaN,
    deliveryDays: below ? below.deliveryDays + 2 : 5,
    revisions: below?.revisions ?? 1,
    videos: below ? below.videos + (tier === "premium" ? 2 : 0) : 1,
    maxSeconds: below?.maxSeconds ?? 60,
    includes: [],
  };
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export type SectionId = "about" | "portfolio" | "packages" | "addons" | "accounts" | "equipment";

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "about", label: "Profile" },
  { id: "portfolio", label: "Portfolio" },
  { id: "packages", label: "Packages" },
  { id: "addons", label: "Add-ons" },
  { id: "accounts", label: "Connected accounts" },
  { id: "equipment", label: "Equipment" },
];

/** Other links that land on a section ("availability" is its own element inside Profile). */
export const SECTION_ALIASES: Record<string, SectionId> = {
  profile: "about",
  skills: "about",
};

export type PackageField = "name" | "summary" | "price" | "deliveryDays" | "revisions" | "videos" | "maxSeconds" | "includes";

export const PACKAGE_NUMBERS: { id: Exclude<PackageField, "name" | "summary" | "includes" | "price">; label: string; min: number; max: number }[] = [
  { id: "deliveryDays", label: "Delivery days", min: 1, max: 60 },
  { id: "revisions", label: "Revisions", min: 0, max: 10 },
  { id: "videos", label: "Videos", min: 1, max: 20 },
  { id: "maxSeconds", label: "Max length (s)", min: 5, max: 600 },
];

/** Error messages by key: "headline", "packages.basic.price", "addons.rush.price"… */
export type Errors = Record<string, string>;

export function validate(draft: ProfileDraft): Errors {
  const e: Errors = {};
  if (draft.headline.trim().length < HEADLINE_MIN)
    e.headline = `Write at least ${HEADLINE_MIN} characters. It's the first line brands read.`;
  if (draft.bio.trim().length < BIO_MIN)
    e.bio = `Write at least ${BIO_MIN} characters (${BIO_MIN - draft.bio.trim().length} to go). Say who you are and what you're best at.`;
  if (!draft.languages.length) e.languages = "Pick at least one language.";
  if (!draft.formats.length) e.formats = "Pick at least one format you make.";

  draft.packages.forEach((p, index) => {
    const k = (field: PackageField) => `packages.${p.tier}.${field}`;
    if (p.name.trim().length < 3) e[k("name")] = "Name it (at least 3 characters).";
    if (p.summary.trim().length < 10) e[k("summary")] = "Say what's in it in one line.";
    for (const f of PACKAGE_NUMBERS) {
      const v = p[f.id];
      if (!Number.isInteger(v) || v < f.min || v > f.max) e[k(f.id)] = `Whole number, ${f.min}–${f.max}.`;
    }
    const videos = Number.isInteger(p.videos) && p.videos > 0 ? p.videos : 1;
    const priceError = Number.isFinite(p.price) ? priceLimitError(p.price, videos) : "Set a price.";
    if (priceError) e[k("price")] = priceError;
    const previous = draft.packages[index - 1];
    if (!priceError && previous && Number.isFinite(previous.price) && p.price <= previous.price)
      e[k("price")] = `Price it above ${tierLabel(previous.tier)} (${money(previous.price)}).`;
    if (!p.includes.length) e[k("includes")] = "List at least one thing that's included.";
  });

  for (const a of addons) {
    const row = draft.addons[a.id];
    if (!row.on) continue;
    if (!(Number.isInteger(row.price) && row.price >= 5 && row.price <= 5000)) e[`addons.${a.id}.price`] = "Whole dollars, $5–5,000.";
    if (!(Number.isInteger(row.extraDays) && row.extraDays >= -10 && row.extraDays <= 30))
      e[`addons.${a.id}.extraDays`] = "Whole days, −10 to 30.";
  }
  return e;
}

export function sectionOfKey(key: string): SectionId {
  if (key.startsWith("packages.")) return "packages";
  if (key.startsWith("addons.")) return "addons";
  return "about";
}

/* -------------------------------------------------------------------------- */
/* Profile strength (V1's checklist)                                           */
/* -------------------------------------------------------------------------- */

export type StrengthItem = { id: string; label: string; detail: string; done: boolean; section: SectionId | "settings" };

/** What makes a creator profile convincing to a brand, as a checklist. */
export function profileChecklist(s: DemoState, creator: Creator): StrengthItem[] {
  const videos = portfolio(s, creator);
  const sampled = new Set(videos.map((v) => v.lang));
  const covered = creator.languages.filter((l) => sampled.has(l)).length;
  const priced = creator.packages.filter((p) => Number.isFinite(p.price) && p.price > 0).length;
  const bioLength = creator.bio.trim().length;
  const connected = (creator.socials ?? []).filter((x) => x.verified);
  return [
    {
      id: "portfolio",
      label: "Portfolio of 5 or more videos",
      detail: videos.length >= 5 ? `${videos.length} videos` : `${videos.length} of 5`,
      done: videos.length >= 5,
      section: "portfolio",
    },
    { id: "packages", label: "All 3 packages priced", detail: `${Math.min(priced, 3)} of 3`, done: priced >= 3, section: "packages" },
    {
      id: "bio",
      label: "An intro bio",
      detail: bioLength >= BIO_MIN ? "Written" : `${bioLength} of ${BIO_MIN} characters`,
      done: bioLength >= BIO_MIN,
      section: "about",
    },
    { id: "verified", label: "ID verified", detail: creator.verified ? "Verified" : "Takes 2 minutes", done: creator.verified, section: "settings" },
    {
      id: "accounts",
      label: "A social account connected",
      detail: connected.length ? `${connected.length} connected` : "Unlocks campaigns",
      done: connected.length > 0,
      section: "accounts",
    },
    {
      id: "languages",
      label: "A sample in every language you list",
      detail: `${covered} of ${creator.languages.length}`,
      done: creator.languages.length > 0 && covered >= creator.languages.length,
      section: "portfolio",
    },
    {
      id: "featured",
      label: "A featured video",
      detail: creator.portfolioIds.includes(creator.featuredVideoId) ? "Picked" : "Star your best piece",
      done: creator.portfolioIds.includes(creator.featuredVideoId),
      section: "portfolio",
    },
    { id: "addons", label: "Two or more add-ons", detail: `${creator.addons.length} offered`, done: creator.addons.length >= 2, section: "addons" },
  ];
}

export const strengthScore = (items: StrengthItem[]) =>
  items.length ? Math.round((items.filter((i) => i.done).length / items.length) * 100) : 0;

/* -------------------------------------------------------------------------- */
/* Draft state                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A local draft of a slice of the store. `dirty` compares by value. When the store changes
 * underneath (another tab, a demo reset) and there are no local edits, the draft follows it.
 * `commit(saved)` marks what was just saved as the new clean state.
 */
export function useDraft<T>(source: T) {
  const sourceKey = JSON.stringify(source);
  const [state, setState] = useState<{ key: string; draft: T }>({ key: sourceKey, draft: source });
  let current = state;
  if (state.key !== sourceKey) {
    const hadEdits = JSON.stringify(state.draft) !== state.key;
    current = { key: sourceKey, draft: hadEdits ? state.draft : source };
    setState(current);
  }
  return {
    draft: current.draft,
    dirty: JSON.stringify(current.draft) !== sourceKey,
    set: (next: (previous: T) => T) => setState((st) => ({ ...st, draft: next(st.draft) })),
    reset: () => setState({ key: sourceKey, draft: source }),
    commit: (saved: T) => setState({ key: JSON.stringify(saved), draft: saved }),
  };
}
