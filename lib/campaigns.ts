/**
 * Pure UGC-campaign logic shared by the store (actions) and selectors (UI): slots, eligibility,
 * money. A campaign is a ContentRequest with `kind: "campaign"`; each slot a creator takes is a
 * Commission with `source: "campaign"` and `campaignSlot`.
 */

import { tierById } from "./taxonomy";
import type { Account, Commission, ContentRequest, Creator, SocialAccount } from "./types";

type Data = { commissions: Commission[]; accounts: Account[] };

export const isCampaign = (r: Pick<ContentRequest, "kind"> | undefined) => r?.kind === "campaign";

/** Every slot commission ever created on a campaign (including cancelled ones), oldest first. */
export function slotHistory(s: Pick<Data, "commissions">, requestId: string): Commission[] {
  return s.commissions
    .filter((c) => c.source === "campaign" && c.requestId === requestId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

/** A slot is taken while its commission isn't cancelled (in work, in review, or approved). */
export const occupiesSlot = (c: Commission) => c.status !== "cancelled" && c.status !== "declined";

export type SlotView = {
  slot: number;
  /** The creator currently in this slot (undefined = open). */
  commission?: Commission;
  /** Earlier creators on this slot (removed or rejected). */
  previous: Commission[];
};

export function campaignSlots(s: Pick<Data, "commissions">, request: ContentRequest): SlotView[] {
  const history = slotHistory(s, request.id);
  return Array.from({ length: request.slots }, (_, index) => {
    const slot = index + 1;
    const onSlot = history.filter((c) => c.campaignSlot === slot);
    return {
      slot,
      commission: onSlot.find(occupiesSlot),
      previous: onSlot.filter((c) => !occupiesSlot(c)),
    };
  });
}

export function openSlotNumbers(s: Pick<Data, "commissions">, request: ContentRequest): number[] {
  return campaignSlots(s, request)
    .filter((view) => !view.commission)
    .map((view) => view.slot);
}

export const openSlotCount = (s: Pick<Data, "commissions">, request: ContentRequest) =>
  request.status === "closed" || request.status === "draft" ? 0 : openSlotNumbers(s, request).length;

/** Progress counts for the owner's header: taken / in review / approved / open. */
export function campaignProgress(s: Pick<Data, "commissions">, request: ContentRequest) {
  const views = campaignSlots(s, request);
  const taken = views.filter((v) => v.commission);
  return {
    total: request.slots,
    taken: taken.length,
    open: views.length - taken.length,
    filming: taken.filter((v) => v.commission!.status === "in_progress" || v.commission!.status === "revision").length,
    review: taken.filter((v) => v.commission!.status === "delivered").length,
    approved: taken.filter((v) => v.commission!.status === "completed").length,
    postsLive: taken.filter((v) => v.commission!.post?.status === "live").length,
    postsDue: taken.filter((v) => v.commission!.status === "completed" && v.commission!.post?.status !== "live").length,
    reassigned: views.reduce((sum, v) => sum + v.previous.length, 0),
  };
}

/**
 * Money on a campaign. Everything the business paid sits in one hold; approved videos move to
 * creators' wallets (pending, then withdrawable at month end).
 * held = charged + top-ups - refunds - paid out to creators.
 */
export function campaignMoney(s: Pick<Data, "commissions">, request: ContentRequest) {
  const ledger = request.campaign?.ledger ?? [];
  const charged = ledger.filter((e) => e.kind !== "refund").reduce((sum, e) => sum + e.amount, 0);
  const refunded = ledger.filter((e) => e.kind === "refund").reduce((sum, e) => sum + e.amount, 0);
  const history = slotHistory(s, request.id);
  const paidOut = history
    .filter((c) => c.payment.status === "pending" || c.payment.status === "released")
    .reduce((sum, c) => sum + c.price, 0);
  const inWork = history
    .filter((c) => occupiesSlot(c) && c.status !== "completed")
    .reduce((sum, c) => sum + c.price, 0);
  const open = openSlotCount(s, request) * (request.campaign?.pricePerVideo ?? 0);
  return {
    charged,
    refunded,
    paidOut,
    inWork,
    open,
    held: Math.max(0, charged - refunded - paidOut),
    /** What the whole campaign costs at current prices (taken slots keep their price). */
    total: charged - refunded,
  };
}

export type IneligibleReason =
  | "own" // your own campaign
  | "closed"
  | "full"
  | "joined" // already holds a slot
  | "excluded" // removed or rejected on this campaign before
  | "no_profile" // no creator profile yet
  | "no_account" // no connected account on the campaign's platform
  | "unverified"
  | "below"
  | "above";

export type Eligibility =
  | { ok: true; social: SocialAccount }
  | { ok: false; reason: IneligibleReason; social?: SocialAccount };

/**
 * Can this creator take a slot? Only creators whose verified followers on the campaign's platform
 * fall within the tier band see and accept the campaign (first come, first served).
 */
export function eligibility(
  s: Data,
  creator: Creator | undefined,
  request: ContentRequest,
): Eligibility {
  const terms = request.campaign;
  if (!terms) return { ok: false, reason: "closed" };
  if (!creator) return { ok: false, reason: "no_profile" };
  const owner = s.accounts.find((a) => a.businessId === request.businessId);
  if (owner && owner.creatorId === creator.id) return { ok: false, reason: "own" };
  const history = slotHistory(s, request.id).filter((c) => c.creatorId === creator.id);
  if (history.some(occupiesSlot)) return { ok: false, reason: "joined" };
  if (terms.excludedCreatorIds.includes(creator.id)) return { ok: false, reason: "excluded" };
  const social = creator.socials?.find((a) => a.platform === terms.platform);
  if (!social) return { ok: false, reason: "no_account" };
  if (!social.verified) return { ok: false, reason: "unverified", social };
  const tier = tierById[terms.tierId];
  if (social.followers < tier.min) return { ok: false, reason: "below", social };
  if (social.followers >= tier.max) return { ok: false, reason: "above", social };
  if (request.status === "closed" || request.status === "draft") return { ok: false, reason: "closed", social };
  if (openSlotCount(s, request) === 0) return { ok: false, reason: "full", social };
  return { ok: true, social };
}

/** The slot commission this creator holds on a campaign (if any). */
export const mySlot = (s: Pick<Data, "commissions">, requestId: string, creatorId: string | undefined) =>
  creatorId
    ? slotHistory(s, requestId).find((c) => c.creatorId === creatorId && occupiesSlot(c))
    : undefined;
