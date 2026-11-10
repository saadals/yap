/**
 * Pure helpers for Explore → Orders: the item shapes, open requests for accounts without a creator
 * profile, the one quiet line under a campaign card, and chip counts. Safe in render.
 */

import { me, isCampaign, openCampaigns, pitchesForRequest, platformList, type Fit } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { tierById } from "@/lib/taxonomy";
import type { ContentRequest, Pitch } from "@/lib/types";

export type CampaignItem = ReturnType<typeof openCampaigns>[number];

export type RequestItem = {
  request: ContentRequest;
  /** Only with a creator profile to measure against. */
  fit?: Fit;
  invited: boolean;
  pitch?: Pitch;
  hidden: boolean;
  pitchCount: number;
};

/**
 * Open public custom orders for an account without a creator profile (it can read them and set
 * one up to pitch). Its own orders are left out. Newest first.
 */
export function openPublicRequests(s: DemoState): RequestItem[] {
  const { businessId } = me.ids(s);
  const hidden = me.hiddenRequestIds(s);
  return s.requests
    .filter(
      (r) => !isCampaign(r) && r.businessId !== businessId && r.status === "open" && r.visibility === "public",
    )
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))
    .map((request) => ({
      request,
      invited: false,
      hidden: hidden.includes(request.id),
      pitchCount: pitchesForRequest(s, request.id).length,
    }));
}

/**
 * The one quiet line under a campaign card: who it's for when the viewer can't pick a slot, or
 * that they already hold one. Nothing when they can take it (the card says the rest).
 */
export function campaignNote(item: CampaignItem): string | null {
  if (item.slot) return "You picked a slot";
  const { eligibility, request } = item;
  if (eligibility.ok || !request.campaign) return null;
  switch (eligibility.reason) {
    case "below":
    case "above":
    case "no_account":
    case "unverified":
    case "no_profile":
      return `For ${tierById[request.campaign.tierId].label} followers on ${platformList(request.campaign.platforms)}`;
    case "excluded":
      return "Not open to you on this campaign";
    case "joined":
      return "You picked a slot";
    case "own":
    case "closed":
    case "full":
    default:
      return null;
  }
}

/** Keep selected options visible (with a zero count) so they can always be turned off. */
export function withSelected<T extends string>(counts: [T, number][], selected: T[]): [T, number][] {
  const missing = selected.filter((id) => !counts.some(([c]) => c === id));
  return [...counts, ...missing.map((id): [T, number] => [id, 0])];
}

/** Count occurrences across lists, most common first. */
export function countBy<T extends string>(lists: T[][]): [T, number][] {
  const map = new Map<T, number>();
  for (const list of lists) for (const item of list) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
