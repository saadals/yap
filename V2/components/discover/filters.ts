/**
 * Discover filters: parsing to and from the URL, matching, sorting (including "Best for {product}")
 * and the removable "active filter" chips. Pure; safe in render.
 *
 * Every filter lives in the URL so a filtered list is a shareable link:
 *   q, format, lang (comma list), niche (comma list), platform (comma list), kind (comma list),
 *   min, max (starting price), days (fastest package), available=1, sort, product (with sort=fit),
 *   tab=saved.
 */

import { paths } from "@/lib/paths";
import { creatorById, fit, isAdCopy, startingPrice } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import {
  DEFAULT_LANGUAGE,
  DEFAULT_USAGE,
  creatorKindById,
  formatById,
  languageById,
  nicheById,
  platformById,
  platforms,
} from "@/lib/taxonomy";
import type {
  ContentRequest,
  Creator,
  CreatorKind,
  FormatId,
  LanguageId,
  NicheId,
  PlatformId,
  Product,
} from "@/lib/types";

/**
 * Ad placements: where a brand runs an ad, not a place a creator makes videos for. They're left out
 * of the platform filter and of "Makes videos for" on a profile.
 */
const AD_PLACEMENTS: readonly PlatformId[] = ["meta-ads"];

/** Platforms a creator makes videos for (the platform list without ad placements). */
export const creatorPlatforms = platforms.filter((p) => !AD_PLACEMENTS.includes(p.id));

const creatorPlatformById = Object.fromEntries(creatorPlatforms.map((p) => [p.id, p]));

/** A creator's platforms as shown on their profile and searched by Discover. */
export const madeForPlatforms = (c: Creator): PlatformId[] => c.platforms.filter((id) => id in creatorPlatformById);

export type SortId = "recommended" | "fit" | "rating" | "price" | "fastest";
export type DiscoverTabId = "all" | "saved";

export const sortOptions: { value: Exclude<SortId, "fit">; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "rating", label: "Highest rated" },
  { value: "price", label: "Lowest price" },
  { value: "fastest", label: "Fastest delivery" },
];

export type DeliveryCap = 0 | 3 | 5 | 7;

export type Filters = {
  q: string;
  format: FormatId | null;
  langs: LanguageId[];
  niches: NicheId[];
  /** Platforms they make videos for (any of these). */
  platforms: PlatformId[];
  kinds: CreatorKind[];
  /** Starting-price bounds; null = open. */
  priceMin: number | null;
  priceMax: number | null;
  /** Fastest package delivers within this many days (0 = any). */
  days: DeliveryCap;
  available: boolean;
  sort: SortId;
  /** The product "Best for" ranks against (sort = "fit"). */
  product: string | null;
  tab: DiscoverTabId;
};

/** Slider bounds for the starting-price filter. */
export const PRICE_FLOOR = 50;
export const PRICE_CEIL = 1000;
export const PRICE_STEP = 10;

export const emptyFilters: Filters = {
  q: "",
  format: null,
  langs: [],
  niches: [],
  platforms: [],
  kinds: [],
  priceMin: null,
  priceMax: null,
  days: 0,
  available: false,
  sort: "recommended",
  product: null,
  tab: "all",
};

/* -------------------------------------------------------------------------- */
/* URL                                                                         */
/* -------------------------------------------------------------------------- */

type ParamSource = { get(name: string): string | null };

function list<T extends string>(raw: string | null, valid: Record<string, unknown>): T[] {
  if (!raw) return [];
  const seen = new Set<string>();
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part in valid && !seen.has(part) && seen.add(part)) as T[];
}

function priceParam(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.max(PRICE_FLOOR, Math.min(PRICE_CEIL, Math.round(value / PRICE_STEP) * PRICE_STEP));
}

export function parseFilters(params: ParamSource): Filters {
  const format = params.get("format");
  const sort = params.get("sort");
  const days = Number(params.get("days"));
  let priceMin = priceParam(params.get("min"));
  let priceMax = priceParam(params.get("max"));
  if (priceMin === PRICE_FLOOR) priceMin = null;
  if (priceMax === PRICE_CEIL) priceMax = null;
  if (priceMin !== null && priceMax !== null && priceMin > priceMax) [priceMin, priceMax] = [priceMax, priceMin];
  return {
    q: params.get("q") ?? "",
    format: format && format in formatById ? (format as FormatId) : null,
    langs: list<LanguageId>(params.get("lang"), languageById),
    niches: list<NicheId>(params.get("niche"), nicheById),
    platforms: list<PlatformId>(params.get("platform"), creatorPlatformById),
    kinds: list<CreatorKind>(params.get("kind"), creatorKindById),
    priceMin,
    priceMax,
    days: days === 3 || days === 5 || days === 7 ? days : 0,
    available: params.get("available") === "1",
    sort:
      sort === "fit" || sortOptions.some((o) => o.value === sort) ? (sort as SortId) : "recommended",
    product: params.get("product"),
    tab: params.get("tab") === "saved" ? "saved" : "all",
  };
}

/** Query string (without "?") for the given filters; defaults are omitted. */
export function toQuery(f: Filters, { includeQ = true } = {}): string {
  const params = new URLSearchParams();
  if (f.tab === "saved") params.set("tab", "saved");
  if (includeQ && f.q.trim()) params.set("q", f.q.trim());
  if (f.format) params.set("format", f.format);
  if (f.langs.length) params.set("lang", f.langs.join(","));
  if (f.niches.length) params.set("niche", f.niches.join(","));
  if (f.platforms.length) params.set("platform", f.platforms.join(","));
  if (f.kinds.length) params.set("kind", f.kinds.join(","));
  if (f.priceMin !== null) params.set("min", String(f.priceMin));
  if (f.priceMax !== null) params.set("max", String(f.priceMax));
  if (f.days) params.set("days", String(f.days));
  if (f.available) params.set("available", "1");
  if (f.sort !== "recommended") params.set("sort", f.sort);
  if (f.sort === "fit" && f.product) params.set("product", f.product);
  // Keep list values readable in the address bar (lang=en,es).
  return params.toString().replace(/%2C/gi, ",");
}

/** The Discover URL for a set of filters (built on paths.discover so the route stays in one place). */
export function discoverHref(f: Filters): string {
  const query = toQuery(f);
  return `${paths.discover()}${query ? `?${query}` : ""}`;
}

/* -------------------------------------------------------------------------- */
/* Matching                                                                    */
/* -------------------------------------------------------------------------- */

export const fastestDelivery = (c: Creator) =>
  c.packages.length ? Math.min(...c.packages.map((p) => p.deliveryDays)) : 99;

/** Creators with no packages can't be ordered; give them an infinite starting price. */
export const fromPrice = (c: Creator) => (c.packages.length ? startingPrice(c) : Number.POSITIVE_INFINITY);

function matchesQuery(c: Creator, q: string): boolean {
  const needle = q.trim().toLowerCase().replace(/^@/, "");
  if (!needle) return true;
  const haystack = [
    c.name,
    c.handle,
    c.headline,
    creatorKindById[c.kind].name,
    ...c.languages.map((l) => languageById[l].name),
    ...c.niches.map((n) => nicheById[n].name),
    ...c.formats.map((f) => formatById[f].name),
    ...madeForPlatforms(c).map((p) => platformById[p].name),
  ]
    .join(" ")
    .toLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

export function matches(c: Creator, f: Filters): boolean {
  if (!matchesQuery(c, f.q)) return false;
  if (f.format && !c.formats.includes(f.format)) return false;
  if (f.langs.length && !f.langs.some((l) => c.languages.includes(l))) return false;
  if (f.niches.length && !f.niches.some((n) => c.niches.includes(n))) return false;
  if (f.platforms.length && !f.platforms.some((p) => c.platforms.includes(p))) return false;
  if (f.kinds.length && !f.kinds.includes(c.kind)) return false;
  const from = fromPrice(c);
  if (f.priceMin !== null && from < f.priceMin) return false;
  if (f.priceMax !== null && from > f.priceMax) return false;
  if (f.days && fastestDelivery(c) > f.days) return false;
  if (f.available && !c.available) return false;
  return true;
}

/* -------------------------------------------------------------------------- */
/* "Best for {product}": fit to a saved product, explained                     */
/* -------------------------------------------------------------------------- */

export type ProductFit = { score: number; reasons: string[] };

/** Middle value of a non-empty list. */
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

/** Most common first; ties keep first-seen order. */
function byCount<T>(values: T[]): T[] {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}

/**
 * How well a creator fits one of your products. Builds a stand-in video order from the product's
 * own history and runs the same `fit` that ranks pitches, plus a bonus for creators who already
 * made a video for it:
 *
 * - Each order counts once: a custom order and the job hired from it are one order, and a UGC
 *   campaign is one order however many creators picked it.
 * - Ad copy is left out (no format or on-camera language to match).
 * - Format: the most common one. Languages: those used in two or more orders, else the most
 *   common one (English when there's no history), so one Spanish video doesn't make everyone
 *   else a partial match.
 * - Budget: up to the most paid for one video job, "within your budget" at the usual (median)
 *   price. Campaign slots are left out (their price is per creator, not per job).
 */
export function productFit(s: DemoState, creator: Creator, product: Product): ProductFit {
  const requests = s.requests.filter((r) => r.brief.productId === product.id && !isAdCopy(r));
  const requestIds = new Set(requests.map((r) => r.id));
  const jobs = s.commissions.filter(
    (c) => c.brief.productId === product.id && !isAdCopy(c) && c.source !== "campaign",
  );
  const briefs = [
    ...requests.map((r) => r.brief),
    ...jobs.filter((c) => !c.requestId || !requestIds.has(c.requestId)).map((c) => c.brief),
  ];

  const format: FormatId = byCount(briefs.map((b) => b.format))[0] ?? "app-demo";
  const languageUses = briefs.flatMap((b) => [...new Set(b.languages)]);
  const common = byCount(languageUses).filter((l) => languageUses.filter((x) => x === l).length >= 2);
  const languages: LanguageId[] = common.length ? common : [byCount(languageUses)[0] ?? DEFAULT_LANGUAGE];
  const prices = jobs.map((c) => c.price);
  const budget = prices.length ? { min: median(prices), max: Math.max(...prices) } : { min: 180, max: 300 };

  const stand: ContentRequest = {
    id: `fit-${product.id}`,
    businessId: product.businessId,
    title: product.name,
    brief: {
      ...(briefs[0] ?? emptyBrief(product.id)),
      productId: product.id,
      jobType: "video",
      format,
      languages,
    },
    budget,
    dueDate: "",
    postedAt: "",
    closesAt: "",
    status: "open",
    visibility: "public",
    invitedCreatorIds: [],
    preferredKinds: [],
    slots: 1,
    views: 0,
    kind: "custom",
  };
  const base = fit(s, creator, stand);
  // Finished video work for this product, campaign videos included.
  const before = s.commissions.filter(
    (c) =>
      c.brief.productId === product.id && c.creatorId === creator.id && c.status === "completed" && !isAdCopy(c),
  ).length;
  // Most telling first: the category and the format they've made, then language (most speak English).
  const rank = (reason: string) =>
    reason.startsWith("Works with") ? 0 : /portfolio$|^Offers/.test(reason) ? 1 : reason.startsWith("Speaks") ? 2 : 3;
  const reasons = [...base.reasons].sort((a, b) => rank(a) - rank(b));
  let score = base.score + creator.rating * 2;
  if (before) {
    score += 10;
    reasons.unshift(`Made ${before === 1 ? "a video" : `${before} videos`} for ${product.name}`);
  }
  return { score, reasons };
}

function emptyBrief(productId: string): ContentRequest["brief"] {
  return {
    productId,
    jobType: "video",
    format: "app-demo",
    platforms: [],
    languages: [DEFAULT_LANGUAGE],
    aspect: "9:16",
    videoCount: 1,
    durationSec: 45,
    audience: "",
    goal: "",
    keyMessage: "",
    mustInclude: [],
    avoid: [],
    references: [],
    onCamera: true,
    usage: DEFAULT_USAGE,
    addons: [],
  };
}

/* -------------------------------------------------------------------------- */
/* Sorting                                                                     */
/* -------------------------------------------------------------------------- */

/** Quality plus match to what the viewer asked for (language, format). */
function recommendScore(s: DemoState, c: Creator, f: Filters): number {
  let score = c.rating * 20 + c.repeatClientRate * 0.25 + c.onTimeRate * 0.2;
  if (c.topRated) score += 3;
  if (c.verified) score += 2;
  if (f.langs.length) score += c.languages.filter((l) => f.langs.includes(l)).length * 6;
  if (f.format) {
    const made = s.videos.filter((v) => v.creatorId === c.id && v.format === f.format).length;
    score += Math.min(made, 3) * 4 + (c.formats[0] === f.format ? 4 : 0);
  }
  // A new profile with nothing to watch yet sorts after the others.
  if (!c.portfolioIds.length) score -= 40;
  return score;
}

export function sortCreators(
  s: DemoState,
  creators: Creator[],
  f: Filters,
  product?: Product,
): Creator[] {
  const sorted = [...creators];
  if (f.sort === "fit" && product) {
    const scores = new Map(sorted.map((c) => [c.id, productFit(s, c, product).score]));
    return sorted.sort(
      (a, b) => Number(b.available) - Number(a.available) || (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0),
    );
  }
  switch (f.sort) {
    case "rating":
      return sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case "price":
      return sorted.sort((a, b) => fromPrice(a) - fromPrice(b) || b.rating - a.rating);
    case "fastest":
      return sorted.sort(
        (a, b) =>
          Number(b.available) - Number(a.available) ||
          fastestDelivery(a) - fastestDelivery(b) ||
          b.rating - a.rating,
      );
    // "fit" without a product falls back to the recommended order.
    default: {
      const scores = new Map(sorted.map((c) => [c.id, recommendScore(s, c, f)]));
      return sorted.sort(
        (a, b) =>
          Number(b.available) - Number(a.available) || (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0),
      );
    }
  }
}

export function filterCreators(s: DemoState, f: Filters, product?: Product): Creator[] {
  return sortCreators(
    s,
    s.creators.filter((c) => matches(c, f)),
    f,
    product,
  );
}

/** Saved creators that still exist, in the order they were saved (newest first). */
export function savedCreators(s: DemoState, ids: string[]): Creator[] {
  return ids.map((id) => creatorById(s, id)).filter((c): c is Creator => Boolean(c));
}

/* -------------------------------------------------------------------------- */
/* Sheet helpers and active chips                                              */
/* -------------------------------------------------------------------------- */

/** Filters that live in the Filters sheet (not search, the format row, sort or tab). */
export function sheetFilterCount(f: Filters): number {
  return (
    f.langs.length +
    f.niches.length +
    f.platforms.length +
    f.kinds.length +
    (f.priceMin !== null || f.priceMax !== null ? 1 : 0) +
    (f.days ? 1 : 0) +
    Number(f.available)
  );
}

export function clearSheetFilters(f: Filters): Filters {
  return { ...emptyFilters, q: f.q, format: f.format, sort: f.sort, product: f.product, tab: f.tab };
}

export function priceLabel(f: Pick<Filters, "priceMin" | "priceMax">): string {
  if (f.priceMin === null && f.priceMax === null) return "Any price";
  if (f.priceMax === null) return `From $${f.priceMin}`;
  if (f.priceMin === null) return `Up to $${f.priceMax.toLocaleString("en-US")}`;
  return `$${f.priceMin}–${f.priceMax.toLocaleString("en-US")}`;
}

export type ActiveChip = { key: string; label: string; remove: (f: Filters) => Filters };

/** Every active filter as a removable chip (search included; the format row shows its own). */
export function activeChips(f: Filters): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (f.q.trim()) chips.push({ key: "q", label: `“${f.q.trim()}”`, remove: (x) => ({ ...x, q: "" }) });
  for (const id of f.langs)
    chips.push({
      key: `lang-${id}`,
      label: languageById[id].name,
      remove: (x) => ({ ...x, langs: x.langs.filter((l) => l !== id) }),
    });
  for (const id of f.niches)
    chips.push({
      key: `niche-${id}`,
      label: nicheById[id].name,
      remove: (x) => ({ ...x, niches: x.niches.filter((n) => n !== id) }),
    });
  for (const id of f.platforms)
    chips.push({
      key: `platform-${id}`,
      label: platformById[id].name,
      remove: (x) => ({ ...x, platforms: x.platforms.filter((p) => p !== id) }),
    });
  for (const id of f.kinds)
    chips.push({
      key: `kind-${id}`,
      label: creatorKindById[id].name,
      remove: (x) => ({ ...x, kinds: x.kinds.filter((k) => k !== id) }),
    });
  if (f.priceMin !== null || f.priceMax !== null)
    chips.push({ key: "price", label: priceLabel(f), remove: (x) => ({ ...x, priceMin: null, priceMax: null }) });
  if (f.days)
    chips.push({ key: "days", label: `Delivers in ${f.days} days or less`, remove: (x) => ({ ...x, days: 0 }) });
  if (f.available)
    chips.push({ key: "available", label: "Available now", remove: (x) => ({ ...x, available: false }) });
  return chips;
}

export function toggleIn<T>(items: T[], value: T): T[] {
  return items.includes(value) ? items.filter((v) => v !== value) : [...items, value];
}
