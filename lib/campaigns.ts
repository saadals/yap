/**
 * Pure UGC-campaign logic shared by the store (actions) and selectors (UI): slots, eligibility,
 * money. Tiers only decide eligibility; the price per Yapp is the brand's. A campaign is a ContentRequest with `kind: "campaign"`; each slot a creator takes is a
 * Commission with `source: "campaign"` and `campaignSlot`.
 */

import { addDays } from "./clock";
import { priceBreakdown } from "./format";
import { CAMPAIGN_FEE_RATE, CAMPAIGN_KEEP_LIVE_DAYS, campaignPlatformById, tierById } from "./taxonomy";
import type {
  Account,
  CampaignPlatformId,
  CampaignTerms,
  Commission,
  ContentRequest,
  Creator,
  SocialAccount,
} from "./types";

type Data = { commissions: Commission[]; accounts: Account[] };

export const isCampaign = (r: Pick<ContentRequest, "kind"> | undefined) => r?.kind === "campaign";

/* -------------------------------------------------------------------------- */
/* Platforms (a campaign may list several; each creator posts on one)          */
/* -------------------------------------------------------------------------- */

/** "@daftar.app": the account to tag on this platform (falls back to the first one listed). */
export function brandHandleFor(
  terms: Pick<CampaignTerms, "platforms" | "brandHandles">,
  platform: CampaignPlatformId | undefined = terms.platforms[0],
): string {
  return (
    (platform ? terms.brandHandles[platform] : undefined) ??
    terms.brandHandles[terms.platforms[0]] ??
    Object.values(terms.brandHandles).find(Boolean) ??
    "the brand account"
  );
}

/** Every handle the campaign lists (allowed through contact masking). */
export const allBrandHandles = (terms: Pick<CampaignTerms, "brandHandles">) =>
  Object.values(terms.brandHandles).filter((h): h is string => Boolean(h));

/** "TikTok", "TikTok or Instagram", "TikTok, Instagram or Snapchat". */
export function platformList(platforms: CampaignPlatformId[], joiner: "or" | "and" = "or"): string {
  const names = platforms.map((p) => campaignPlatformById[p].name);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} ${joiner} ${names[names.length - 1]}`;
}

/**
 * The platform a campaign slot posts on: the one the creator chose when picking, or (older slots)
 * the campaign's first platform.
 */
export function slotPlatform(
  c: Pick<Commission, "postPlatform">,
  request: Pick<ContentRequest, "campaign"> | undefined,
): CampaignPlatformId {
  return c.postPlatform ?? request?.campaign?.platforms[0] ?? "tiktok";
}

/**
 * Why a post link can't be accepted for this platform, or null when it can: a web link on one of
 * the platform's hosts (tiktok.com for TikTok, and so on). Production also checks that it belongs to
 * the creator's connected account.
 */
export function postLinkProblem(url: string, platform: CampaignPlatformId): string | null {
  const value = url.trim();
  if (!/^https?:\/\/\S+\.\S+/i.test(value)) return "Paste the full link, starting with https://";
  let host = "";
  try {
    host = new URL(value).hostname.toLowerCase();
  } catch {
    return "Paste the full link, starting with https://";
  }
  const info = campaignPlatformById[platform];
  const ok = info.hosts.some((h) => host === h || host.endsWith(`.${h}`));
  return ok ? null : `That isn't a ${info.name} link. Post on ${info.name} and paste that link.`;
}

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
 * A campaign's money at one price. The brand pays `videos × price` when it posts, nothing on top,
 * and it is held; each creator receives the price less Yapp's 20% when their slot is released.
 */
export function campaignBudget(videos: number, pricePerVideo: number) {
  const slot = priceBreakdown(pricePerVideo, [], CAMPAIGN_FEE_RATE);
  return {
    videos,
    pricePerVideo,
    /** Charged and held when the campaign is posted. */
    total: videos * pricePerVideo,
    /** What each creator receives for an approved, verified Yapp. */
    perCreator: slot.creatorEarns,
    /** Yapp's share of each slot (deducted from the creator's pay). */
    feePerSlot: slot.fee,
  };
}

/**
 * Money on a campaign, in listed prices (what the brand pays). The full amount is charged when the
 * campaign is posted and held. An approved video stays held (pending) until 7 days after the
 * creator's post is verified; then its price is released (the creator receives 80% of it, Yapp keeps
 * 20%). Unpicked slots are refunded when the campaign closes, in full.
 *   held = charged + top-ups − refunds − released
 */
export function campaignMoney(s: Pick<Data, "commissions">, request: ContentRequest) {
  const ledger = request.campaign?.ledger ?? [];
  const charged = ledger.filter((e) => e.kind !== "refund").reduce((sum, e) => sum + e.amount, 0);
  const refunded = ledger.filter((e) => e.kind === "refund").reduce((sum, e) => sum + e.amount, 0);
  const history = slotHistory(s, request.id);
  const listed = (c: Commission) => priceBreakdown(c.price, c.addons, c.feeRate).total;
  const releasedSlots = history.filter((c) => c.payment.status === "released");
  const released = releasedSlots.reduce((sum, c) => sum + listed(c), 0);
  const creatorsReceived = releasedSlots.reduce(
    (sum, c) => sum + priceBreakdown(c.price, c.addons, c.feeRate).creatorEarns,
    0,
  );
  const pending = history.filter((c) => c.payment.status === "pending").reduce((sum, c) => sum + listed(c), 0);
  const inWork = history
    .filter((c) => occupiesSlot(c) && c.status !== "completed")
    .reduce((sum, c) => sum + listed(c), 0);
  const open = openSlotCount(s, request) * (request.campaign?.pricePerVideo ?? 0);
  return {
    /** On the card so far (the charge at posting and any top-ups). */
    charged,
    /** Back to the card. */
    refunded,
    /** Released for approved, verified videos (listed prices). */
    released,
    /** Of `released`, what the creators received (80%); the rest is Yapp's fee. */
    creatorsReceived,
    /** Approved, waiting for 7 days after a verified post. */
    pending,
    inWork,
    open,
    held: Math.max(0, Math.round((charged - refunded - released) * 100) / 100),
    /** Released so far: what this campaign has actually cost. */
    spent: released,
    /** What the whole campaign costs at current prices (taken slots keep their price). */
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

/**
 * `platform` is where the creator would post (ok) or the platform the reason is about (not ok);
 * `platforms` lists every campaign platform this creator could pick on (ok only).
 */
export type Eligibility =
  | { ok: true; social: SocialAccount; platform: CampaignPlatformId; platforms: CampaignPlatformId[] }
  | { ok: false; reason: IneligibleReason; social?: SocialAccount; platform?: CampaignPlatformId };

/** Eligibility on one of the campaign's platforms. */
export type PlatformEligibility =
  | { platform: CampaignPlatformId; ok: true; social: SocialAccount }
  | {
      platform: CampaignPlatformId;
      ok: false;
      reason: "no_account" | "unverified" | "below" | "above";
      social?: SocialAccount;
    };

/** The follower check on each of the campaign's platforms (the reasons that differ per platform). */
export function platformEligibility(creator: Creator | undefined, request: ContentRequest): PlatformEligibility[] {
  const terms = request.campaign;
  if (!terms) return [];
  const tier = tierById[terms.tierId];
  return terms.platforms.map((platform): PlatformEligibility => {
    const social = creator?.socials?.find((a) => a.platform === platform);
    if (!social) return { platform, ok: false, reason: "no_account" };
    if (!social.verified) return { platform, ok: false, reason: "unverified", social };
    if (social.followers < tier.min) return { platform, ok: false, reason: "below", social };
    if (social.followers >= tier.max) return { platform, ok: false, reason: "above", social };
    return { platform, ok: true, social };
  });
}

/** When no platform passes, the one closest to passing explains why: a count beats no account. */
const reasonRank: Record<"below" | "above" | "unverified" | "no_account", number> = {
  below: 0,
  above: 1,
  unverified: 2,
  no_account: 3,
};

/**
 * Can this creator take a slot? Only creators whose verified followers on one of the campaign's
 * platforms fall within the tier band can pick (first come, first served). Pass `platform` to ask
 * about one platform (the one chosen in the pick sheet); without it, any listed platform will do
 * and `platform` in the answer is the first that passes.
 */
export function eligibility(
  s: Data,
  creator: Creator | undefined,
  request: ContentRequest,
  platform?: CampaignPlatformId,
): Eligibility {
  const terms = request.campaign;
  if (!terms) return { ok: false, reason: "closed" };
  if (!creator) return { ok: false, reason: "no_profile" };
  const owner = s.accounts.find((a) => a.businessId === request.businessId);
  if (owner && owner.creatorId === creator.id) return { ok: false, reason: "own" };
  const history = slotHistory(s, request.id).filter((c) => c.creatorId === creator.id);
  if (history.some(occupiesSlot)) return { ok: false, reason: "joined" };
  if (terms.excludedCreatorIds.includes(creator.id)) return { ok: false, reason: "excluded" };
  if (platform && !terms.platforms.includes(platform)) return { ok: false, reason: "no_account", platform };
  const checks = platformEligibility(creator, request).filter((c) => !platform || c.platform === platform);
  const passing = checks.filter((c): c is PlatformEligibility & { ok: true } => c.ok);
  if (!passing.length) {
    const best = checks
      .filter((c): c is PlatformEligibility & { ok: false } => !c.ok)
      .sort((a, b) => reasonRank[a.reason] - reasonRank[b.reason])[0];
    return { ok: false, reason: best?.reason ?? "no_account", social: best?.social, platform: best?.platform };
  }
  const first = passing[0];
  if (request.status === "closed" || request.status === "draft")
    return { ok: false, reason: "closed", social: first.social, platform: first.platform };
  if (openSlotCount(s, request) === 0) return { ok: false, reason: "full", social: first.social, platform: first.platform };
  return { ok: true, social: first.social, platform: first.platform, platforms: passing.map((c) => c.platform) };
}

/** The slot commission this creator holds on a campaign (if any). */
export const mySlot = (s: Pick<Data, "commissions">, requestId: string, creatorId: string | undefined) =>
  creatorId
    ? slotHistory(s, requestId).find((c) => c.creatorId === creatorId && occupiesSlot(c))
    : undefined;
