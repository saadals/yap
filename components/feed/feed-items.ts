/**
 * What the Home reels feed shows, as a pure function of the store (no randomness: the mix is
 * ordered with `hashString`, so the same account sees the same feed on every render).
 *
 * - video: creators' portfolio videos (vertical first, one or two per creator), never the
 *   account's own creator profile.
 * - order: open custom requests anyone can pitch on (public, or inviting this account's creator
 *   profile), not the account's own, not dismissed ("Not interested").
 * - campaign: open UGC campaigns with slots left, not the account's own, not dismissed.
 *
 * "Mix" alternates the two kinds, weighted by what the account does: with a creator profile
 * about two orders per video, without one about two videos per order. `reel` (from `?reel=`)
 * starts the feed with that order, even the account's own (just published): "Your order".
 */

import { hashString } from "@/lib/hash";
import { paths } from "@/lib/paths";
import type { Eligibility } from "@/lib/selectors";
import {
  creatorById,
  eligibility,
  isCampaign,
  me,
  myPitchFor,
  mySlot,
  openCampaigns,
  openSlotCount,
  pitchesForRequest,
  portfolio,
  requestById,
} from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import type { Commission, ContentRequest, Creator, Pitch, Video } from "@/lib/types";

export type FeedFilter = "for-you" | "orders" | "videos";

export const feedFilters: { value: FeedFilter; label: string }[] = [
  { value: "for-you", label: "Mix" },
  { value: "videos", label: "Yapps" },
  { value: "orders", label: "Orders" },
];

export const isFeedFilter = (value: unknown): value is FeedFilter =>
  value === "for-you" || value === "orders" || value === "videos";

export type VideoItem = { kind: "video"; id: string; video: Video; creator: Creator };

export type OrderItem = {
  kind: "order";
  id: string;
  request: ContentRequest;
  /** The account's own order (only ever shown through `?reel=`). */
  own: boolean;
  invited: boolean;
  pitch?: Pitch;
  pitchCount: number;
};

export type CampaignItem = {
  kind: "campaign";
  id: string;
  request: ContentRequest;
  own: boolean;
  eligibility: Eligibility;
  openSlots: number;
  /** The slot this account's creator profile holds on it. */
  slot?: Commission;
};

export type FeedItem = VideoItem | OrderItem | CampaignItem;

/** Where a reel's work happens: the details layer's button leads here. */
export function reelHref(item: FeedItem): string {
  if (item.kind === "video") return paths.orderCreator(item.creator.handle, { video: item.video.id });
  return paths.order(item.request.id);
}

/** Home, starting the feed on one order (use it after publishing). */
export const homeReelHref = (id: string) => paths.reel(id);

/** Light canvas palette 1–6 for an order reel, stable per order. */
export const reelPalette = (id: string) => (mix(hashString(`color:${id}`)) % 6) + 1;

/** "page" means no reel is in view (details, the end card): the chrome follows the theme. */
export type ReelTone = "dark" | "light" | "page";

/** Videos are dark, order and campaign canvases are light (in both themes: they're media). */
export const reelTone = (item: FeedItem): ReelTone => (item.kind === "video" ? "dark" : "light");

/** murmur3's finaliser: FNV alone keeps similar ids ("r-201", "r-202") in order. */
function mix(hash: number): number {
  let h = hash;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Stable shuffle: sort by a salted hash of each id. */
function byHash<T>(list: T[], idOf: (item: T) => string, salt: string): T[] {
  return list
    .map((item) => ({ item, key: mix(hashString(`${salt}:${idOf(item)}`)) }))
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.item);
}

const vertical = (v: Video) => v.aspect === "9:16";

/** One or two videos per creator, vertical first; spread so one creator never plays twice in a row. */
function videoItems(s: DemoState, salt: string): VideoItem[] {
  const ownCreatorId = me.ids(s).creatorId;
  const creators = byHash(
    s.creators.filter((c) => c.id !== ownCreatorId),
    (c) => c.id,
    salt,
  );
  const picks = creators.map((creator) => {
    const videos = portfolio(s, creator);
    const featured = videos.find((v) => v.id === creator.featuredVideoId);
    const ordered = [
      ...(featured && vertical(featured) ? [featured] : []),
      ...videos.filter((v) => vertical(v) && v !== featured),
      ...(featured && !vertical(featured) ? [featured] : []),
      ...videos.filter((v) => !vertical(v) && v !== featured),
    ];
    // Creators with a deep portfolio get a second reel.
    const count = ordered.filter(vertical).length >= 3 ? 2 : 1;
    return ordered.slice(0, count).map((video): VideoItem => ({ kind: "video", id: video.id, video, creator }));
  });
  // Round one: every creator's first video; round two: the second ones.
  return [...picks.map((p) => p[0]), ...picks.map((p) => p[1])].filter(
    (item): item is VideoItem => Boolean(item),
  );
}

function orderItem(s: DemoState, request: ContentRequest, own: boolean): OrderItem {
  const creatorId = me.ids(s).creatorId;
  return {
    kind: "order",
    id: request.id,
    request,
    own,
    invited: Boolean(creatorId && request.invitedCreatorIds.includes(creatorId)),
    pitch: creatorId ? myPitchFor(s, request.id, creatorId) : undefined,
    pitchCount: pitchesForRequest(s, request.id).length,
  };
}

function campaignItem(s: DemoState, request: ContentRequest, own: boolean): CampaignItem {
  const creatorId = me.ids(s).creatorId;
  return {
    kind: "campaign",
    id: request.id,
    request,
    own,
    eligibility: eligibility(s, me.creator(s), request),
    openSlots: openSlotCount(s, request),
    slot: mySlot(s, request.id, creatorId),
  };
}

/** Orders and campaigns other people placed that this account can act on. */
function orderItems(s: DemoState, salt: string): (OrderItem | CampaignItem)[] {
  const ids = me.ids(s);
  const hidden = me.hiddenRequestIds(s);
  const custom = s.requests
    .filter(
      (r) =>
        !isCampaign(r) &&
        r.businessId !== ids.businessId &&
        r.status === "open" &&
        !hidden.includes(r.id) &&
        (r.visibility === "public" || Boolean(ids.creatorId && r.invitedCreatorIds.includes(ids.creatorId))),
    )
    .map((r) => orderItem(s, r, false));
  const campaigns = openCampaigns(s)
    .filter((c) => !c.hidden && c.request.status === "open" && c.openSlots > 0)
    .map(
      (c): CampaignItem => ({
        kind: "campaign",
        id: c.request.id,
        request: c.request,
        own: false,
        eligibility: c.eligibility,
        openSlots: c.openSlots,
        slot: c.slot,
      }),
    );
  return byHash([...campaigns, ...custom], (item) => item.id, salt);
}

/** Interleave by a repeating pattern ("a" or "b" per step); leftovers go at the end. */
function interleave<A, B>(a: A[], b: B[], pattern: ("a" | "b")[]): (A | B)[] {
  const out: (A | B)[] = [];
  let i = 0;
  let j = 0;
  let step = 0;
  while (i < a.length || j < b.length) {
    const want = pattern[step % pattern.length];
    step += 1;
    if ((want === "a" && i < a.length) || j >= b.length) out.push(a[i++]);
    else out.push(b[j++]);
  }
  return out;
}

/** One reel by id, for `?reel=` and `?details=`: an order (any owner, even closed) or a portfolio video. */
export function feedItemById(s: DemoState, reelId: string): FeedItem | undefined {
  const request = requestById(s, reelId);
  if (request) {
    if (request.status === "draft") return undefined;
    const own = request.businessId === me.ids(s).businessId;
    if (!own && me.hiddenRequestIds(s).includes(request.id)) return undefined;
    return isCampaign(request) ? campaignItem(s, request, own) : orderItem(s, request, own);
  }
  // Portfolio videos only (deliveries are private to their commission).
  const video = s.videos.find((v) => v.id === reelId);
  const creator = video ? creatorById(s, video.creatorId) : undefined;
  if (video && creator && creator.id !== me.ids(s).creatorId)
    return { kind: "video", id: video.id, video, creator };
  return undefined;
}

export function feedItems(
  s: DemoState,
  { filter, reel }: { filter: FeedFilter; reel?: string | null },
): FeedItem[] {
  const salt = s.activeAccountId;
  const videos = filter === "orders" ? [] : videoItems(s, salt);
  const orders = filter === "videos" ? [] : orderItems(s, salt);
  const makes = Boolean(me.ids(s).creatorId);
  const mixed =
    filter === "videos"
      ? videos
      : filter === "orders"
        ? orders
        : interleave<OrderItem | CampaignItem, VideoItem>(
            orders,
            videos,
            makes ? ["a", "a", "b"] : ["b", "b", "a"],
          );

  const first = reel ? feedItemById(s, reel) : undefined;
  const fits =
    first &&
    (filter === "for-you" ||
      (filter === "orders" && first.kind !== "video") ||
      (filter === "videos" && first.kind === "video"));
  if (!first || !fits) return mixed;
  return [first, ...mixed.filter((item) => item.id !== first.id)];
}

/** Short spoken name for a reel ("Video by Layla Mansour", "Order from Kanz: …"). */
export function reelLabel(item: FeedItem, businessName?: string): string {
  if (item.kind === "video") return `Video by ${item.creator.name}: ${item.video.title}`;
  const who = item.own ? "Your order" : `${item.kind === "campaign" ? "Campaign" : "Order"} from ${businessName ?? "a buyer"}`;
  return `${who}: ${item.request.title}`;
}
