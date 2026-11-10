/**
 * Pure UGC-campaign logic shared by the store (actions) and selectors (UI): slots, eligibility,
 * money. A campaign is a ContentRequest with `kind: "campaign"`; each slot a creator takes is a
 * Commission with `source: "campaign"` and `campaignSlot`.
 */

import { addDays } from "./clock";
import { priceBreakdown } from "./format";
import { CAMPAIGN_FEE_RATE, CAMPAIGN_KEEP_LIVE_DAYS, tierById } from "./taxonomy";
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
 * Creators' money plus the campaign service fee on it: what the card is charged (or refunded) for
 * that many slots. `subtotal` goes to creators (they keep 100%), `fee` to Yapp when it's released.
 */
export function withCampaignFee(subtotal: number) {
  const { fee, total } = priceBreakdown(subtotal, [], CAMPAIGN_FEE_RATE);
  return { subtotal, fee, total };
}

/** The fee held for one slot commission (its price × its fee rate). */
const slotFee = (c: Commission) => priceBreakdown(c.price, c.addons, c.feeRate).fee;

/**
 * Money on a campaign. The budget and its service fee are charged when the campaign is posted and
 * held per slot. An approved video stays held (pending) until 7 days after the creator's post is
 * verified; then its price is released to the creator and its fee to Yapp.
 *   held = charged + top-ups − refunds − released (price + fee)
 * Every figure includes the fee except `paidOut` and `pending`, which are creators' money.
 */
export function campaignMoney(s: Pick<Data, "commissions">, request: ContentRequest) {
  const ledger = request.campaign?.ledger ?? [];
  const charges = ledger.filter((e) => e.kind !== "refund");
  const refunds = ledger.filter((e) => e.kind === "refund");
  const charged = charges.reduce((sum, e) => sum + e.amount, 0);
  const refunded = refunds.reduce((sum, e) => sum + e.amount, 0);
  const fees = charges.reduce((sum, e) => sum + e.fee, 0) - refunds.reduce((sum, e) => sum + e.fee, 0);
  const history = slotHistory(s, request.id);
  const released = history.filter((c) => c.payment.status === "released");
  const paidOut = released.reduce((sum, c) => sum + c.price, 0);
  const feesReleased = released.reduce((sum, c) => sum + slotFee(c), 0);
  const pending = history.filter((c) => c.payment.status === "pending").reduce((sum, c) => sum + c.price, 0);
  const inWork = history
    .filter((c) => occupiesSlot(c) && c.status !== "completed")
    .reduce((sum, c) => sum + c.price, 0);
  const open = openSlotCount(s, request) * (request.campaign?.pricePerVideo ?? 0);
  return {
    /** On the card so far (charges and top-ups), fee included. */
    charged,
    /** Back to the card, fee included. */
    refunded,
    /** Service fee on what's still charged (charged − refunded). */
    fees,
    /** Released to creators. */
    paidOut,
    /** Approved, waiting for 7 days after a verified post. */
    pending,
    inWork,
    open,
    held: Math.max(0, Math.round((charged - refunded - paidOut - feesReleased) * 100) / 100),
    /** Released so far, fee included: what this campaign has actually cost. */
    spent: paidOut + feesReleased,
    /** What the whole campaign costs at current prices (taken slots keep their price), fee included. */
    total: charged - refunded,
  };
}

/** When a verified post may come down without breaking the keep-live period. */
export const keepLiveUntil = (c: Pick<Commission, "post">) =>
  c.post?.verifiedAt ? addDays(c.post.verifiedAt, CAMPAIGN_KEEP_LIVE_DAYS) : undefined;

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
