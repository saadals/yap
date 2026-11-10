/**
 * Discover's real figures: pure derivations from the demo store (no sample numbers here; those
 * live in ./sample.ts). Everything is computed from what the store holds, so it agrees with the
 * rest of the app: Live briefs come from `findWork`, the reviews from `s.reviews`.
 */

import { DAY, NOW } from "@/lib/clock";
import { daysFromNow } from "@/lib/format";
import {
  businessById,
  cityById,
  creatorById,
  findWork,
  portfolio,
  productById,
} from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { niches } from "@/lib/taxonomy";
import type { Business, Creator, NicheId, Review, Video } from "@/lib/types";

/* ---------------------------------------------------------------- creators */

/** Mean views of the creator's portfolio videos that report views; null when none do. */
export function avgViews(s: DemoState, creator: Creator): number | null {
  const views = portfolio(s, creator)
    .map((video) => video.stats?.views)
    .filter((value): value is number => typeof value === "number");
  if (!views.length) return null;
  return Math.round(views.reduce((a, b) => a + b, 0) / views.length);
}

/** "565K", "1.2M", "8.4K": views at a glance (whole thousands from 10K up). */
export function viewsLabel(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (views >= 10_000) return `${Math.round(views / 1000)}K`;
  if (views >= 1000) return `${(views / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(views);
}

/** The median of every creator's average views (for "vs median"). */
export function medianAvgViews(s: DemoState): number | null {
  const all = s.creators
    .map((creator) => avgViews(s, creator))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  if (!all.length) return null;
  const mid = Math.floor(all.length / 2);
  return all.length % 2 ? all[mid] : Math.round((all[mid - 1] + all[mid]) / 2);
}

/** "Ottawa": the city name alone. */
export const cityName = (creator: Creator) => cityById(creator.cityId)?.name ?? "";

/** The fastest package's delivery days. */
export const fastestDelivery = (creator: Creator) =>
  Math.min(...creator.packages.map((p) => p.deliveryDays));

/** Total verified followers across connected accounts (null when none are connected). */
export function totalFollowers(creator: Creator): number | null {
  const socials = creator.socials ?? [];
  if (!socials.length) return creator.followers ?? null;
  return socials.reduce((sum, account) => sum + account.followers, 0);
}

/* -------------------------------------------------------------- categories */

export type CategoryStat = {
  id: NicheId;
  name: string;
  /** Orders placed in the last 30 days: custom orders, campaigns and direct orders. */
  orders: number;
  /** Creators who work in the category, most viewed first. */
  creators: Creator[];
  /** The panel's featured creator: the most viewed not already featured by a higher-ranked category. */
  featured?: Creator;
  /** Portfolio videos made in the category, featured creator's first. */
  videos: Video[];
};

const within30 = (iso: string) => {
  const age = NOW - Date.parse(iso);
  return age <= 30 * DAY;
};

/**
 * The eight categories ranked by demand: orders placed in the last 30 days (custom orders and
 * campaigns posted, plus direct orders), ties in taxonomy order. Discover's "Hot categories" file
 * and the explore strip both use this order.
 */
export function categoryDemand(s: DemoState): CategoryStat[] {
  const nicheOfProduct = (productId: string, businessId: string): NicheId | undefined =>
    productById(s, productId)?.niche ?? businessById(s, businessId)?.industry;
  const counts = new Map<NicheId, number>();
  const bump = (id: NicheId | undefined) => {
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  };
  for (const request of s.requests) {
    if (request.status === "draft" || !within30(request.postedAt)) continue;
    bump(nicheOfProduct(request.brief.productId, request.businessId));
  }
  for (const commission of s.commissions) {
    if (commission.source !== "direct" && commission.source !== "repeat") continue;
    if (!within30(commission.createdAt)) continue;
    bump(nicheOfProduct(commission.brief.productId, commission.businessId));
  }

  const views = new Map(s.creators.map((c) => [c.id, avgViews(s, c) ?? 0]));
  return niches
    .map((niche, order) => {
      const creators = s.creators
        .filter((c) => c.niches.includes(niche.id))
        .sort((a, b) => (views.get(b.id) ?? 0) - (views.get(a.id) ?? 0));
      const featured = creators[0];
      const videos = creators.flatMap((c) =>
        portfolio(s, c).filter((v) => v.niche === niche.id),
      );
      return {
        stat: {
          id: niche.id,
          name: niche.name,
          orders: counts.get(niche.id) ?? 0,
          creators,
          featured,
          videos,
        } satisfies CategoryStat,
        order,
      };
    })
    .sort((a, b) => b.stat.orders - a.stat.orders || a.order - b.order)
    .map((entry) => entry.stat)
    .reduce<CategoryStat[]>((out, stat) => {
      // A different featured creator on each panel where the category allows it.
      const taken = new Set(out.map((c) => c.featured?.id));
      const featured = stat.creators.find((c) => !taken.has(c.id)) ?? stat.creators[0];
      const videos = featured
        ? [...stat.videos.filter((v) => v.creatorId === featured.id), ...stat.videos.filter((v) => v.creatorId !== featured.id)]
        : stat.videos;
      out.push({ ...stat, featured, videos });
      return out;
    }, []);
}

/* ------------------------------------------------------------- Live briefs */

/** The six newest open orders (the same source as Find work; answers, item 32). */
export function liveBriefs(s: DemoState) {
  const result = findWork(s, { sort: "newest", pageSize: 6 });
  const all = findWork(s, { sort: "newest", pageSize: 500 });
  const today = all.items.filter((item) => daysFromNow(item.postedAt) === 0).length;
  return { items: result.items, total: result.total, newToday: today };
}

/* ------------------------------------------------------------------ ticker */

export type TickerPart = string | { strong: string };
export type TickerItem = { id: string; parts: TickerPart[]; at: string };

const shortName = (creator: Creator) => {
  const [first, ...rest] = creator.name.split(/\s+/);
  const last = rest.length ? rest[rest.length - 1] : "";
  return last ? `${first} ${last.charAt(0)}.` : first;
};

/**
 * The latest platform events: deliveries, hires, accepted orders, picked slots, approvals, posts
 * that went live and reviews. Brands ordering in their own name are left out (a person isn't a
 * brand to name in public).
 */
export function tickerItems(s: DemoState, count = 6): TickerItem[] {
  const out: TickerItem[] = [];
  const events = s.commissions
    .flatMap((commission) =>
      commission.events.map((event) => ({ event, commission })),
    )
    .sort((a, b) => Date.parse(b.event.at) - Date.parse(a.event.at));
  const seen = new Set<string>();
  for (const { event, commission } of events) {
    if (out.length >= count) break;
    const business = businessById(s, commission.businessId);
    const creator = creatorById(s, commission.creatorId);
    if (!business || !creator || business.kind === "personal") continue;
    const brand = { strong: business.name };
    const who = { strong: shortName(creator) };
    let parts: TickerPart[] | null = null;
    switch (event.kind) {
      case "delivered":
        parts = [who, " delivered a Yapp to ", brand];
        break;
      case "slot_accepted":
        parts = [who, " picked a slot on ", brand, "'s campaign"];
        break;
      case "hired":
        parts = [brand, " hired ", who];
        break;
      case "offer_accepted":
        parts = [who, " accepted an order from ", brand];
        break;
      case "approved":
        parts = [brand, " approved a Yapp from ", who];
        break;
      case "post_verified":
        parts = [who, "'s post for ", brand, " went live"];
        break;
      case "reviewed":
        parts = [brand, " reviewed ", who];
        break;
      default:
        parts = null;
    }
    if (!parts) continue;
    const key = `${event.kind}:${commission.businessId}:${commission.creatorId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: event.id, parts, at: event.at });
  }
  return out;
}

/* ----------------------------------------------------------------- reviews */

export type RatingSummary = {
  average: number;
  count: number;
  /** 5★ down to 1★, as shares of all reviews (0–1). */
  distribution: { stars: number; share: number }[];
};

/** Every review on Yapp comes from a completed order; the count is the real one, never rounded up. */
export function ratingSummary(s: DemoState): RatingSummary {
  const reviews = s.reviews;
  const count = reviews.length;
  const average = count ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;
  return {
    average,
    count,
    distribution: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      share: count ? reviews.filter((r) => Math.round(r.rating) === stars).length / count : 0,
    })),
  };
}

export type ReviewView = { review: Review; business: Business; creator: Creator };

/** Three recent five-star reviews from three different brands about three different creators. */
export function featuredReviews(s: DemoState, count = 3): ReviewView[] {
  const out: ReviewView[] = [];
  const brands = new Set<string>();
  const creators = new Set<string>();
  const sorted = [...s.reviews].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  for (const review of sorted) {
    if (out.length >= count) break;
    if (review.rating < 5 || brands.has(review.businessId) || creators.has(review.creatorId)) continue;
    const business = businessById(s, review.businessId);
    const creator = creatorById(s, review.creatorId);
    if (!business || !creator || business.kind === "personal") continue;
    brands.add(business.id);
    creators.add(creator.id);
    out.push({ review, business, creator });
  }
  return out;
}

/** The first sentences of a review, up to about `max` characters, ending on a sentence. */
export function excerpt(text: string, max = 170): string {
  const sentences = text.match(/[^.!?]+[.!?]+["”’)]?\s*/g) ?? [text];
  let out = "";
  for (const sentence of sentences) {
    if (out && (out + sentence).length > max) break;
    out += sentence;
  }
  return out.trim() || text;
}

/* -------------------------------------------------------------- brand band */

/** Brands on Yapp for the band: companies only, most hires first. */
export function bandBrands(s: DemoState, count = 8): Business[] {
  return s.businesses
    .filter((b) => b.kind !== "personal")
    .sort((a, b) => b.hires - a.hires || a.name.localeCompare(b.name))
    .slice(0, count);
}
