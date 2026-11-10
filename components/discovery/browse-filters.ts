/**
 * Browse filters for /creators: parsing to and from the URL, matching, sorting and the
 * removable "active filter" chips. Pure; safe in render.
 */

import { startingPrice } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import {
  creatorKindById,
  formatById,
  languageById,
  nicheById,
  platformById,
} from "@/lib/taxonomy";
import type {
  Creator,
  CreatorKind,
  FormatId,
  LanguageId,
  NicheId,
  PlatformId,
} from "@/lib/types";

export type SortId = "recommended" | "rating" | "price" | "fastest" | "repeat";

export const sortOptions: { value: SortId; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "rating", label: "Highest rated" },
  { value: "price", label: "Lowest price" },
  { value: "fastest", label: "Fastest delivery" },
  { value: "repeat", label: "Most repeat clients" },
];

export type RatingFloor = 0 | 4.5 | 4.8;
export type DeliveryCap = 0 | 3 | 5 | 7;

export type BrowseFilters = {
  q: string;
  format: FormatId | null;
  langs: LanguageId[];
  kinds: CreatorKind[];
  /** "From" price bounds; null = open. */
  priceMin: number | null;
  priceMax: number | null;
  rating: RatingFloor;
  /** Fastest package delivers within this many days (0 = any). */
  days: DeliveryCap;
  niches: NicheId[];
  platforms: PlatformId[];
  available: boolean;
  posts: boolean;
  topRated: boolean;
  sort: SortId;
};

/** Slider bounds for the starting-price filter. */
export const PRICE_FLOOR = 50;
export const PRICE_CEIL = 1000;
export const PRICE_STEP = 10;

export const emptyFilters: BrowseFilters = {
  q: "",
  format: null,
  langs: [],
  kinds: [],
  priceMin: null,
  priceMax: null,
  rating: 0,
  days: 0,
  niches: [],
  platforms: [],
  available: false,
  posts: false,
  topRated: false,
  sort: "recommended",
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
  const clamped = Math.max(PRICE_FLOOR, Math.min(PRICE_CEIL, Math.round(value / PRICE_STEP) * PRICE_STEP));
  return clamped;
}

export function parseFilters(params: ParamSource): BrowseFilters {
  const format = params.get("format");
  const sort = params.get("sort");
  const rating = Number(params.get("rating"));
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
    kinds: list<CreatorKind>(params.get("kind"), creatorKindById),
    priceMin,
    priceMax,
    rating: rating === 4.5 || rating === 4.8 ? rating : 0,
    days: days === 3 || days === 5 || days === 7 ? days : 0,
    niches: list<NicheId>(params.get("niche"), nicheById),
    platforms: list<PlatformId>(params.get("platform"), platformById),
    available: params.get("available") === "1",
    posts: params.get("posts") === "1",
    topRated: params.get("top") === "1",
    sort: sortOptions.some((o) => o.value === sort) ? (sort as SortId) : "recommended",
  };
}

/** Query string (without "?") for the given filters; defaults are omitted. */
export function toQuery(f: BrowseFilters, { includeQ = true } = {}): string {
  const params = new URLSearchParams();
  if (includeQ && f.q.trim()) params.set("q", f.q.trim());
  if (f.format) params.set("format", f.format);
  if (f.langs.length) params.set("lang", f.langs.join(","));
  if (f.kinds.length) params.set("kind", f.kinds.join(","));
  if (f.priceMin !== null) params.set("min", String(f.priceMin));
  if (f.priceMax !== null) params.set("max", String(f.priceMax));
  if (f.rating) params.set("rating", String(f.rating));
  if (f.days) params.set("days", String(f.days));
  if (f.niches.length) params.set("niche", f.niches.join(","));
  if (f.platforms.length) params.set("platform", f.platforms.join(","));
  if (f.available) params.set("available", "1");
  if (f.posts) params.set("posts", "1");
  if (f.topRated) params.set("top", "1");
  if (f.sort !== "recommended") params.set("sort", f.sort);
  // Keep list values readable in the address bar (lang=en,es).
  return params.toString().replace(/%2C/gi, ",");
}

/* -------------------------------------------------------------------------- */
/* Matching and sorting                                                        */
/* -------------------------------------------------------------------------- */

export const fastestDelivery = (c: Creator) => Math.min(...c.packages.map((p) => p.deliveryDays));

/** Influencers, or anyone who sells the "post to my account" add-on. */
export const postsToAudience = (c: Creator) =>
  c.kind === "influencer" || c.addons.some((a) => a.id === "post-to-account");

function matchesQuery(c: Creator, q: string): boolean {
  const needle = q.trim().toLowerCase().replace(/^@/, "");
  if (!needle) return true;
  const haystack = [
    c.name,
    c.handle,
    c.headline,
    ...c.languages.map((l) => languageById[l].name),
    ...c.niches.map((n) => nicheById[n].name),
    ...c.formats.map((f) => formatById[f].name),
  ]
    .join(" ")
    .toLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

export function matches(c: Creator, f: BrowseFilters): boolean {
  if (!matchesQuery(c, f.q)) return false;
  if (f.format && !c.formats.includes(f.format)) return false;
  if (f.langs.length && !f.langs.some((l) => c.languages.includes(l))) return false;
  if (f.kinds.length && !f.kinds.includes(c.kind)) return false;
  const from = startingPrice(c);
  if (f.priceMin !== null && from < f.priceMin) return false;
  if (f.priceMax !== null && from > f.priceMax) return false;
  if (f.rating && c.rating < f.rating) return false;
  if (f.days && fastestDelivery(c) > f.days) return false;
  if (f.niches.length && !f.niches.some((n) => c.niches.includes(n))) return false;
  if (f.platforms.length && !f.platforms.some((p) => c.platforms.includes(p))) return false;
  if (f.available && !c.available) return false;
  if (f.posts && !postsToAudience(c)) return false;
  if (f.topRated && !c.topRated) return false;
  return true;
}

/** Quality plus match to what the viewer asked for (language, format). */
function recommendScore(s: DemoState, c: Creator, f: BrowseFilters): number {
  let score = c.rating * 20 + c.repeatClientRate * 0.25 + c.onTimeRate * 0.2;
  if (c.topRated) score += 3;
  if (c.verified) score += 2;
  if (f.langs.length) score += c.languages.filter((l) => f.langs.includes(l)).length * 6;
  if (f.format) {
    const made = s.videos.filter((v) => v.creatorId === c.id && v.format === f.format).length;
    score += Math.min(made, 3) * 4 + (c.formats[0] === f.format ? 4 : 0);
  }
  return score;
}

export function sortCreators(s: DemoState, list: Creator[], f: BrowseFilters): Creator[] {
  const sorted = [...list];
  switch (f.sort) {
    case "rating":
      return sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case "price":
      return sorted.sort((a, b) => startingPrice(a) - startingPrice(b) || b.rating - a.rating);
    case "fastest":
      return sorted.sort(
        (a, b) =>
          Number(b.available) - Number(a.available) ||
          fastestDelivery(a) - fastestDelivery(b) ||
          b.rating - a.rating,
      );
    case "repeat":
      return sorted.sort((a, b) => b.repeatClientRate - a.repeatClientRate || b.rating - a.rating);
    default: {
      const scores = new Map(sorted.map((c) => [c.id, recommendScore(s, c, f)]));
      return sorted.sort(
        (a, b) =>
          Number(b.available) - Number(a.available) ||
          (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0),
      );
    }
  }
}

export function filterCreators(s: DemoState, f: BrowseFilters): Creator[] {
  return sortCreators(
    s,
    s.creators.filter((c) => matches(c, f)),
    f,
  );
}

/* -------------------------------------------------------------------------- */
/* Sheet helpers and active chips                                              */
/* -------------------------------------------------------------------------- */

/** Filters that live in the Filters sheet (not search, format bar or sort). */
export function sheetFilterCount(f: BrowseFilters): number {
  return (
    f.langs.length +
    f.kinds.length +
    (f.priceMin !== null || f.priceMax !== null ? 1 : 0) +
    (f.rating ? 1 : 0) +
    (f.days ? 1 : 0) +
    f.niches.length +
    f.platforms.length +
    Number(f.available) +
    Number(f.posts) +
    Number(f.topRated)
  );
}

export function clearSheetFilters(f: BrowseFilters): BrowseFilters {
  return { ...emptyFilters, q: f.q, format: f.format, sort: f.sort };
}

export function priceLabel(f: Pick<BrowseFilters, "priceMin" | "priceMax">): string {
  if (f.priceMin === null && f.priceMax === null) return "Any price";
  if (f.priceMax === null) return `From $${f.priceMin}`;
  if (f.priceMin === null) return `Up to $${f.priceMax.toLocaleString("en-US")}`;
  return `$${f.priceMin}–${f.priceMax.toLocaleString("en-US")}`;
}

export type ActiveChip = { key: string; label: string; remove: (f: BrowseFilters) => BrowseFilters };

/** Every active filter as a removable chip (search and format included). */
export function activeChips(f: BrowseFilters): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (f.q.trim())
    chips.push({ key: "q", label: `“${f.q.trim()}”`, remove: (x) => ({ ...x, q: "" }) });
  if (f.format)
    chips.push({ key: "format", label: formatById[f.format].name, remove: (x) => ({ ...x, format: null }) });
  for (const id of f.langs)
    chips.push({
      key: `lang-${id}`,
      label: languageById[id].name,
      remove: (x) => ({ ...x, langs: x.langs.filter((l) => l !== id) }),
    });
  for (const id of f.kinds)
    chips.push({
      key: `kind-${id}`,
      label: creatorKindById[id].name,
      remove: (x) => ({ ...x, kinds: x.kinds.filter((k) => k !== id) }),
    });
  if (f.priceMin !== null || f.priceMax !== null)
    chips.push({ key: "price", label: priceLabel(f), remove: (x) => ({ ...x, priceMin: null, priceMax: null }) });
  if (f.rating)
    chips.push({ key: "rating", label: `Rated ${f.rating}+`, remove: (x) => ({ ...x, rating: 0 }) });
  if (f.days)
    chips.push({ key: "days", label: `Delivers in ${f.days} days or less`, remove: (x) => ({ ...x, days: 0 }) });
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
  if (f.available)
    chips.push({ key: "available", label: "Available now", remove: (x) => ({ ...x, available: false }) });
  if (f.posts)
    chips.push({ key: "posts", label: "Posts to their audience", remove: (x) => ({ ...x, posts: false }) });
  if (f.topRated)
    chips.push({ key: "top", label: "Top rated", remove: (x) => ({ ...x, topRated: false }) });
  return chips;
}

export function toggleIn<T>(items: T[], value: T): T[] {
  return items.includes(value) ? items.filter((v) => v !== value) : [...items, value];
}
