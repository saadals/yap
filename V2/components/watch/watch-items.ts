/**
 * What Watch shows, as a pure function of the store (no randomness: the mix is ordered with
 * `hashString`, so the same account sees the same order on every render).
 *
 * - All creators (no `creator`): one or two portfolio videos per creator, vertical first, spread
 *   so one creator never plays twice in a row. Never the viewer's own videos.
 * - One creator (`?creator=handle`): their whole portfolio, featured first. Your own portfolio
 *   works too (you see it as brands do).
 * - `?video=id` starts on that video: in the list it's where Watch opens; a portfolio video that
 *   isn't in the mix is put first.
 */

import { hashString } from "@/lib/hash";
import { creatorByHandle, creatorById, me, portfolio } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import type { Creator, Video } from "@/lib/types";

export type WatchItem = { id: string; video: Video; creator: Creator };

/** murmur3's finaliser: FNV alone keeps similar ids in order. */
function mix(hash: number): number {
  let h = hash;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

const byHash = <T,>(list: T[], idOf: (item: T) => string, salt: string): T[] =>
  list
    .map((item) => ({ item, key: mix(hashString(`${salt}:${idOf(item)}`)) }))
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.item);

const vertical = (v: Video) => v.aspect === "9:16";

/** Featured first, then the rest of the portfolio in order. */
function creatorVideos(s: DemoState, creator: Creator): Video[] {
  const videos = portfolio(s, creator);
  const featured = videos.find((v) => v.id === creator.featuredVideoId);
  return featured ? [featured, ...videos.filter((v) => v !== featured)] : videos;
}

function mixItems(s: DemoState, salt: string, signedIn: boolean): WatchItem[] {
  const ownCreatorId = signedIn ? me.ids(s).creatorId : undefined;
  const creators = byHash(
    s.creators.filter((c) => c.id !== ownCreatorId && c.portfolioIds.length > 0),
    (c) => c.id,
    salt,
  );
  const picks = creators.map((creator) => {
    const videos = creatorVideos(s, creator);
    const ordered = [...videos.filter(vertical), ...videos.filter((v) => !vertical(v))];
    // Creators with a deep portfolio get a second video, later in the feed.
    const count = videos.filter(vertical).length >= 3 ? 2 : 1;
    return ordered.slice(0, count).map((video): WatchItem => ({ id: video.id, video, creator }));
  });
  return [...picks.map((p) => p[0]), ...picks.map((p) => p[1])].filter((item): item is WatchItem => Boolean(item));
}

export function watchItems(
  s: DemoState,
  { creatorHandle, startVideoId, signedIn }: { creatorHandle?: string | null; startVideoId?: string | null; signedIn: boolean },
): { items: WatchItem[]; creator?: Creator } {
  if (creatorHandle) {
    const creator = creatorByHandle(s, creatorHandle);
    if (!creator) return { items: [] };
    return { creator, items: creatorVideos(s, creator).map((video) => ({ id: video.id, video, creator })) };
  }
  const items = mixItems(s, signedIn ? s.activeAccountId : "public", signedIn);
  if (!startVideoId || items.some((item) => item.id === startVideoId)) return { items };
  // A portfolio video that isn't in the mix: put it first (deliveries are private and never shown).
  const video = s.videos.find((v) => v.id === startVideoId);
  const owner = video ? creatorById(s, video.creatorId) : undefined;
  if (!video || !owner || !owner.portfolioIds.includes(video.id)) return { items };
  return { items: [{ id: video.id, video, creator: owner }, ...items] };
}
