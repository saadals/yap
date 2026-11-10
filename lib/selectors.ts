/**
 * Pure helpers over the demo state. Safe in render; never mutate what they return.
 */

import {
  campaignMoney,
  campaignProgress,
  eligibility,
  isCampaign,
  mySlot,
  openSlotCount,
  platformList,
} from "./campaigns";
import { DAY, NOW, localDay } from "./clock";
import { unreadRepliesTo } from "./comments";
import { cities, payouts as seedPayouts } from "./data";
import { creatorNet, daysFromNow, money, moneyExact, moneyRange, netRange, plural, priceBreakdown } from "./format";
import type { DemoState, OrderDraft, OrderDraftKind } from "./store";
import { activeAccount, activeIds } from "./store";
import {
  NEW_ORDER_DAYS,
  PICK_NOW,
  WORK_PAGE_SIZE,
  WORK_CLOSING_STEPS,
  WORK_PAY_STEPS,
  countries,
  formatById,
  formats as videoFormats,
  jobTypes,
  languageById,
  nicheById,
  niches,
  platforms as allPlatforms,
} from "./taxonomy";
import type {
  Brief,
  Business,
  CampaignPlatformId,
  Commission,
  CommissionStatus,
  ContentRequest,
  Creator,
  Delivery,
  FollowerTierId,
  FormatId,
  JobType,
  NicheId,
  Pitch,
  PlatformId,
  Role,
  Settings,
  Thread,
  UsageOptionId,
  Video,
} from "./types";

export {
  allBrandHandles,
  brandHandleFor,
  campaignBudget,
  campaignMoney,
  campaignProgress,
  campaignSlots,
  eligibility,
  isCampaign,
  keepLiveUntil,
  mySlot,
  openSlotCount,
  platformEligibility,
  platformList,
  postLinkProblem,
  slotHistory,
  slotPlatform,
} from "./campaigns";
export type { Eligibility, IneligibleReason, PlatformEligibility, SlotView } from "./campaigns";
export {
  commentCounts,
  commentPermissions,
  commentsAreGeneralOnly,
  commentsCloseAt,
  commentsOpen,
  isLatestDelivery,
  openComments,
  requestedComments,
  unreadComments,
  unreadOn,
  unreadRepliesTo,
  visibleComments,
  visibleReplies,
} from "./comments";

/* -------------------------------------------------------------------------- */
/* Lookups                                                                     */
/* -------------------------------------------------------------------------- */

export const creatorById = (s: DemoState, id: string) => s.creators.find((c) => c.id === id);
export const creatorByHandle = (s: DemoState, handle: string) =>
  s.creators.find((c) => c.handle === handle);
export const businessById = (s: DemoState, id: string) => s.businesses.find((b) => b.id === id);
export const productById = (s: DemoState, id: string) => s.products.find((p) => p.id === id);
export const requestById = (s: DemoState, id: string) => s.requests.find((r) => r.id === id);
export const pitchById = (s: DemoState, id: string) => s.pitches.find((p) => p.id === id);
export const commissionById = (s: DemoState, id: string) => s.commissions.find((c) => c.id === id);
export const threadById = (s: DemoState, id: string) => s.threads.find((t) => t.id === id);
export const reviewById = (s: DemoState, id: string) => s.reviews.find((r) => r.id === id);
export const memberById = (s: DemoState, id: string) => s.team.find((m) => m.id === id);
export const cityById = (id: string) => cities.find((c) => c.id === id);
/** "Toronto, Canada" */
export function cityLabel(id: string): string {
  const city = cityById(id);
  return city ? `${city.name}, ${countries[city.countryId].name}` : id;
}

/** Portfolio videos and delivery videos alike. */
export function videoById(s: DemoState, id: string): Video | undefined {
  const portfolio = s.videos.find((v) => v.id === id);
  if (portfolio) return portfolio;
  for (const c of s.commissions) {
    const delivery = c.deliveries.find((d) => d.video?.id === id);
    if (delivery) return delivery.video;
  }
  return undefined;
}

/**
 * The signed-in account (this tab). Every account has a buyer profile (`business`, a company or
 * the person themselves); `member` exists for business accounts and `creator` once a creator
 * profile is set up, so check before using those two.
 */
export const me = {
  ids: (s: DemoState) => activeIds(s),
  account: (s: DemoState) => activeAccount(s),
  business: (s: DemoState) => businessById(s, activeIds(s).businessId)!,
  member: (s: DemoState) => {
    const id = activeIds(s).memberId;
    return id ? memberById(s, id) : undefined;
  },
  creator: (s: DemoState) => {
    const id = activeIds(s).creatorId;
    return id ? creatorById(s, id) : undefined;
  },
  settings: (s: DemoState): Settings =>
    s.settings[s.activeAccountId] ?? Object.values(s.settings)[0],
  /** The previous request wizard's autosaved draft for this account. */
  draft: (s: DemoState) => s.requestDrafts[s.activeAccountId] ?? null,
  /**
   * The new-order form's saved draft of one kind for this account (null = none). `data` comes back
   * exactly as it was saved; pass its type: `me.orderDraft<MyForm>(s, "campaign")`.
   */
  orderDraft: <T = unknown>(s: DemoState, kind: OrderDraftKind): OrderDraft<T> | null =>
    (s.orderDrafts[s.activeAccountId]?.[kind] as OrderDraft<T> | undefined) ?? null,
  /** Both kinds of draft for this account, newest first (for "Your orders"). */
  orderDrafts: (s: DemoState): OrderDraft[] =>
    Object.values(s.orderDrafts[s.activeAccountId] ?? {})
      .filter((d): d is OrderDraft => Boolean(d))
      .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)),
  /** The accounts creators must tag, saved on this account's buyer profile ("@daftar.app" per platform). */
  brandHandles: (s: DemoState): Partial<Record<CampaignPlatformId, string>> =>
    businessById(s, activeIds(s).businessId)?.handles ?? {},
  paymentMethods: (s: DemoState) =>
    s.paymentMethods.filter((m) => m.businessId === activeIds(s).businessId),
  payoutMethods: (s: DemoState) =>
    s.payoutMethods.filter((m) => m.creatorId === activeIds(s).creatorId),
  payouts: (s: DemoState) => s.payouts.filter((p) => p.creatorId === activeIds(s).creatorId),
  team: (s: DemoState) => s.team.filter((m) => m.businessId === activeIds(s).businessId),
  hiddenRequestIds: (s: DemoState) => s.hidden[s.activeAccountId] ?? [],
};

/**
 * Which side of a deal the signed-in account is on (undefined = not theirs). Pass a commission,
 * a thread, or a request ({ businessId } only: the owner is the ordering side).
 */
export function sideOf(
  s: DemoState,
  item: { businessId: string; creatorId?: string },
): Role | undefined {
  const ids = activeIds(s);
  if (item.businessId === ids.businessId) return "business";
  if (item.creatorId && item.creatorId === ids.creatorId) return "creator";
  return undefined;
}

/** Is this buyer profile someone ordering in their own name? */
export const isPersonal = (s: DemoState, businessId: string) =>
  businessById(s, businessId)?.kind === "personal";

/* -------------------------------------------------------------------------- */
/* Creators                                                                    */
/* -------------------------------------------------------------------------- */

export function portfolio(s: DemoState, creator: Creator): Video[] {
  return creator.portfolioIds
    .map((id) => s.videos.find((v) => v.id === id))
    .filter((v): v is Video => Boolean(v));
}

export function featuredVideo(s: DemoState, creator: Creator): Video | undefined {
  return s.videos.find((v) => v.id === creator.featuredVideoId) ?? portfolio(s, creator)[0];
}

export const startingPrice = (creator: Creator) =>
  Math.min(...creator.packages.map((p) => p.price));

export function reviewsForCreator(s: DemoState, creatorId: string) {
  return s.reviews
    .filter((r) => r.creatorId === creatorId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** Saved creators of the signed-in account. */
export const savedCreatorIds = (s: DemoState) => s.saved[s.activeAccountId] ?? [];
export const isSaved = (s: DemoState, creatorId: string) => savedCreatorIds(s).includes(creatorId);

/** Creators similar to this one (shared formats/languages), excluding itself. */
export function similarCreators(s: DemoState, creator: Creator, count = 4): Creator[] {
  const score = (c: Creator) =>
    c.formats.filter((f) => creator.formats.includes(f)).length * 2 +
    c.languages.filter((l) => creator.languages.includes(l)).length * 2 +
    c.niches.filter((n) => creator.niches.includes(n)).length;
  return s.creators
    .filter((c) => c.id !== creator.id)
    .sort((a, b) => score(b) - score(a) || b.rating - a.rating)
    .slice(0, count);
}

/** Creators this business has completed work with, most recent first. */
export function pastCollaborators(s: DemoState, businessId: string = activeIds(s).businessId) {
  const map = new Map<string, { creator: Creator; count: number; last: Commission }>();
  for (const c of s.commissions) {
    if (c.businessId !== businessId || c.status !== "completed") continue;
    const creator = creatorById(s, c.creatorId);
    if (!creator) continue;
    const entry = map.get(creator.id);
    if (!entry) map.set(creator.id, { creator, count: 1, last: c });
    else {
      entry.count += 1;
      if (Date.parse(c.completedAt ?? c.createdAt) > Date.parse(entry.last.completedAt ?? entry.last.createdAt))
        entry.last = c;
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      Date.parse(b.last.completedAt ?? b.last.createdAt) -
      Date.parse(a.last.completedAt ?? a.last.createdAt),
  );
}

/* -------------------------------------------------------------------------- */
/* Fit: how well a creator matches a request (explained, never a black box)    */
/* -------------------------------------------------------------------------- */

export type Fit = { score: number; reasons: string[]; gaps: string[] };

export function fit(s: DemoState, creator: Creator, request: ContentRequest): Fit {
  const reasons: string[] = [];
  const gaps: string[] = [];
  let score = 20;
  const brief = request.brief;

  const langMatches = brief.languages.filter((l) => creator.languages.includes(l));
  if (langMatches.length === brief.languages.length) {
    score += 30;
    reasons.push(`Speaks ${langMatches.map((l) => languageById[l].name).join(" and ")}`);
  } else if (langMatches.length) {
    score += 18;
    reasons.push(`Speaks ${langMatches.map((l) => languageById[l].name).join(", ")}`);
    gaps.push(
      `Doesn't list ${brief.languages
        .filter((l) => !creator.languages.includes(l))
        .map((l) => languageById[l].name)
        .join(", ")}`,
    );
  } else {
    gaps.push(`Doesn't list ${brief.languages.map((l) => languageById[l].name).join(" or ")}`);
  }

  if (isAdCopy(request)) {
    // Ad copy has no format to match: anyone can pitch; listing it counts as a plus.
    score += creator.formats.includes("ad-copy") ? 22 : 12;
    if (creator.formats.includes("ad-copy")) reasons.push("Offers ad copy writing");
  } else if (creator.formats.includes(brief.format)) {
    score += 22;
    const made = portfolio(s, creator).filter((v) => v.format === brief.format).length;
    const [one, many] = formatById[brief.format].noun;
    reasons.push(made ? `${made} ${made === 1 ? one : many} in portfolio` : `Offers ${many}`);
  } else {
    gaps.push(`Hasn't listed ${formatById[brief.format].noun[1]}`);
  }

  const product = s.products.find((p) => p.id === brief.productId);
  if (product && creator.niches.includes(product.niche)) {
    score += 12;
    reasons.push(`Works with ${nicheById[product.niche].noun}`);
  }

  const from = startingPrice(creator);
  if (from <= request.budget.max) {
    score += 10;
    if (from <= request.budget.min) reasons.push("Within your budget");
  } else {
    gaps.push(`Usually starts at $${from}`);
  }

  if (request.preferredKinds.length && request.preferredKinds.includes(creator.kind)) score += 3;
  if (!creator.available) {
    score -= 6;
    gaps.push("Booked right now");
  } else score += 3;
  if (creator.topRated) reasons.push(`Top rated · ${creator.onTimeRate}% on time`);

  return { score: Math.max(28, Math.min(98, score)), reasons: reasons.slice(0, 4), gaps };
}

/* -------------------------------------------------------------------------- */
/* Job types (video or ad copy) and order basics                               */
/* -------------------------------------------------------------------------- */

/** "video" or "ad-copy", for an order, a commission or a brief's holder. */
export const jobTypeOf = (item: { brief: Pick<Brief, "jobType" | "format"> }): JobType =>
  item.brief.jobType ?? (item.brief.format === "ad-copy" ? "ad-copy" : "video");

/**
 * Ad copy: a custom order whose delivery is text, with general comments only, no posting, no tier,
 * and no format, platform, length or aspect to show. Works on orders and commissions alike.
 */
export const isAdCopy = (item: { brief: Pick<Brief, "jobType" | "format"> }) => jobTypeOf(item) === "ad-copy";

/** A delivery of text (ad copy) rather than a video. */
export const isTextDelivery = (d: Pick<Delivery, "kind">) => d.kind === "text";

/** "custom" or "campaign": the two kinds of order ("Custom order", "UGC campaign"). */
export const orderKindOf = (r: Pick<ContentRequest, "kind">): "custom" | "campaign" =>
  r.kind === "campaign" ? "campaign" : "custom";

/** Days the creator has to deliver version 1, set by the brand (undefined on older custom orders). */
export const deadlineDaysOf = (r: Pick<ContentRequest, "deadlineDays" | "campaign">) =>
  r.campaign?.deadlineDays ?? r.deadlineDays;

/** Posted within the last two days (the "New" tag). */
export const isNewOrder = (r: Pick<ContentRequest, "postedAt">) => NOW - Date.parse(r.postedAt) < NEW_ORDER_DAYS * DAY;

/** Whole days until the order closes (0 = today, negative = past). */
export const closesInDays = (r: Pick<ContentRequest, "closesAt">) => daysFromNow(r.closesAt);

/* -------------------------------------------------------------------------- */
/* Requests and pitches                                                        */
/* -------------------------------------------------------------------------- */

/** Orders a buyer profile placed (custom orders and campaigns), newest first. */
export function requestsForBusiness(s: DemoState, businessId: string = activeIds(s).businessId) {
  return s.requests
    .filter((r) => r.businessId === businessId)
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
}

export function pitchesForRequest(s: DemoState, requestId: string): Pitch[] {
  return s.pitches
    .filter((p) => p.requestId === requestId && p.status !== "withdrawn")
    .sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
}

export function pitchesForCreator(
  s: DemoState,
  creatorId: string | undefined = activeIds(s).creatorId,
): Pitch[] {
  if (!creatorId) return [];
  return s.pitches
    .filter((p) => p.creatorId === creatorId)
    .sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
}

export const myPitchFor = (
  s: DemoState,
  requestId: string,
  creatorId: string | undefined = activeIds(s).creatorId,
) =>
  s.pitches.find(
    (p) => p.requestId === requestId && p.creatorId === creatorId && p.status !== "withdrawn",
  );

/**
 * Open custom orders a creator can pitch on (public or invited), best fit first. Excludes UGC
 * campaigns (see `openCampaigns`) and the account's own orders.
 */
export function opportunities(s: DemoState, creatorId: string | undefined = activeIds(s).creatorId) {
  const creator = creatorId ? creatorById(s, creatorId) : undefined;
  if (!creator || !creatorId) return [];
  const myBusinessId = activeIds(s).businessId;
  const hidden = s.hidden[s.activeAccountId] ?? [];
  return s.requests
    .filter(
      (r) =>
        !isCampaign(r) &&
        r.businessId !== myBusinessId &&
        r.status === "open" &&
        (r.visibility === "public" || r.invitedCreatorIds.includes(creatorId)),
    )
    .map((request) => ({
      request,
      fit: fit(s, creator, request),
      invited: request.invitedCreatorIds.includes(creatorId),
      pitch: myPitchFor(s, request.id, creatorId),
      hidden: hidden.includes(request.id),
      pitchCount: pitchesForRequest(s, request.id).length,
    }))
    .sort(
      (a, b) =>
        Number(b.invited) - Number(a.invited) || b.fit.score - a.fit.score,
    );
}

/* -------------------------------------------------------------------------- */
/* Commissions                                                                 */
/* -------------------------------------------------------------------------- */

export const latestDelivery = (c: Commission): Delivery | undefined =>
  c.deliveries[c.deliveries.length - 1];

/** A commission's split: `total` (the brand pays), `fee` (Yapp, 20%), `creatorEarns` (the creator, 80%). */
export const commissionTotals = (c: Commission) => priceBreakdown(c.price, c.addons, c.feeRate);

/** Statuses where the given side has something to do. */
export function needsAction(c: Commission, role: Role): boolean {
  if (role === "business") return c.status === "delivered";
  // Approved campaign video: post it (or post it again if it was taken down) to unlock the pay.
  if (c.source === "campaign" && c.status === "completed")
    return c.post?.status === "due" || c.post?.status === "removed";
  return c.status === "offered" || c.status === "in_progress" || c.status === "revision";
}

const activeOrder: CommissionStatus[] = [
  "delivered",
  "offered",
  "revision",
  "in_progress",
  "disputed",
  "completed",
  "declined",
  "cancelled",
];

function sortForRole(list: Commission[], role: Role) {
  return [...list].sort((a, b) => {
    const action = Number(needsAction(b, role)) - Number(needsAction(a, role));
    if (action) return action;
    const order = activeOrder.indexOf(a.status) - activeOrder.indexOf(b.status);
    if (order) return order;
    if (a.status === "completed" || a.status === "cancelled" || a.status === "declined")
      return Date.parse(b.completedAt ?? b.createdAt) - Date.parse(a.completedAt ?? a.createdAt);
    return Date.parse(a.dueDate) - Date.parse(b.dueDate);
  });
}

/**
 * Work a buyer profile ordered. Campaign slots are left out (a campaign is one row on the ordering
 * side, managed from its order page); pass `includeCampaignSlots` to get them too.
 */
export function commissionsForBusiness(
  s: DemoState,
  businessId: string = activeIds(s).businessId,
  options: { includeCampaignSlots?: boolean } = {},
) {
  return sortForRole(
    s.commissions.filter(
      (c) => c.businessId === businessId && (options.includeCampaignSlots || c.source !== "campaign"),
    ),
    "business",
  );
}

/** Work a creator is making (campaign slots included: each is a real job for them). */
export function commissionsForCreator(
  s: DemoState,
  creatorId: string | undefined = activeIds(s).creatorId,
) {
  if (!creatorId) return [];
  return sortForRole(
    s.commissions.filter((c) => c.creatorId === creatorId),
    "creator",
  );
}

export const isActive = (c: Commission) =>
  c.status === "offered" ||
  c.status === "in_progress" ||
  c.status === "delivered" ||
  c.status === "revision" ||
  c.status === "disputed" ||
  // An approved campaign video still needs posting (or posting again).
  (c.source === "campaign" && c.status === "completed" && (c.post?.status === "due" || c.post?.status === "removed"));

/* -------------------------------------------------------------------------- */
/* Comments on deliveries (rules in lib/comments.ts)                           */
/* -------------------------------------------------------------------------- */

export type CommentAuthorView = {
  side: Role;
  /** "Karim Saleh", "Layla Mansour", "Daftar". */
  name: string;
  firstName: string;
  /** "Co-founder & CEO, Daftar" for a team member; undefined otherwise. */
  title?: string;
  /** Id for <FaceAvatar> when a person wrote it (team member, creator, personal buyer). */
  faceId?: string;
  /** The brand, for <BusinessLogo> when there's no person to show. */
  business?: Business;
  /** Written by the signed-in account's side ("You" / "Your team"). */
  mine: boolean;
  /** Written by the signed-in person themselves: only they may edit or delete it. */
  own: boolean;
};

/** Who wrote a comment or reply on this commission, for a name and a face. */
export function commentAuthor(
  s: DemoState,
  c: Pick<Commission, "businessId" | "creatorId">,
  item: { author: Role; authorId: string },
): CommentAuthorView {
  const mine = sideOf(s, c) === item.author;
  const ids = activeIds(s);
  const own = mine && item.authorId === (item.author === "business" ? (ids.memberId ?? ids.businessId) : ids.creatorId);
  if (item.author === "creator") {
    const creator = creatorById(s, item.authorId) ?? creatorById(s, c.creatorId);
    return {
      side: "creator",
      name: creator?.name ?? "The creator",
      firstName: creator?.firstName ?? "The creator",
      faceId: creator?.id,
      mine,
      own,
    };
  }
  const business = businessById(s, c.businessId);
  const member = memberById(s, item.authorId);
  if (member) {
    return {
      side: "business",
      name: member.name,
      firstName: member.name.split(" ")[0],
      title: business ? `${member.title}, ${business.name}` : member.title,
      faceId: member.id,
      business,
      mine,
      own,
    };
  }
  const name = business?.name ?? "The brand";
  return {
    side: "business",
    name,
    firstName: business?.kind === "personal" ? name.split(" ")[0] : name,
    faceId: business?.kind === "personal" ? (business.faceId ?? business.id) : undefined,
    business,
    mine,
    own,
  };
}

/**
 * Replies the creator hasn't read, on comments they wrote, across their commissions: "Daftar replied
 * to your comment" in Work's "Needs you". Newest first.
 */
export function repliesForCreator(s: DemoState) {
  return commissionsForCreator(s)
    .flatMap((commission) => unreadRepliesTo(commission, "creator").map((hit) => ({ commission, ...hit })))
    .sort((a, b) => Date.parse(b.reply.createdAt) - Date.parse(a.reply.createdAt));
}

/* -------------------------------------------------------------------------- */
/* Campaigns                                                                   */
/* -------------------------------------------------------------------------- */

/** Campaigns the signed-in account placed. */
export const myCampaigns = (s: DemoState) =>
  requestsForBusiness(s).filter((r) => isCampaign(r));

/**
 * Open UGC campaigns for the signed-in account's creator profile (or for browsing without one):
 * with eligibility, open slots and the slot this creator holds. Own campaigns excluded.
 */
export function openCampaigns(s: DemoState) {
  const ids = activeIds(s);
  const creator = ids.creatorId ? creatorById(s, ids.creatorId) : undefined;
  const hidden = s.hidden[s.activeAccountId] ?? [];
  return s.requests
    .filter((r) => isCampaign(r) && r.businessId !== ids.businessId && (r.status === "open" || r.status === "hired"))
    .map((request) => ({
      request,
      eligibility: eligibility(s, creator, request),
      openSlots: openSlotCount(s, request),
      slot: mySlot(s, request.id, ids.creatorId),
      hidden: hidden.includes(request.id),
    }))
    .sort((a, b) => Number(b.eligibility.ok) - Number(a.eligibility.ok) || Date.parse(b.request.postedAt) - Date.parse(a.request.postedAt));
}

/** What needs the owner on their campaigns: review copies waiting, and so on. */
export function campaignAttention(s: DemoState) {
  return myCampaigns(s)
    .filter((r) => r.status !== "closed" && r.status !== "draft")
    .map((request) => ({ request, progress: campaignProgress(s, request), money: campaignMoney(s, request) }))
    .filter((item) => item.progress.review > 0);
}

/** Previous commissions for the same product (for "carry forward" context). */
export function historyForProduct(s: DemoState, productId: string, excludeId?: string) {
  return s.commissions
    .filter((c) => c.brief.productId === productId && c.id !== excludeId && c.status === "completed")
    .sort((a, b) => Date.parse(b.completedAt ?? b.createdAt) - Date.parse(a.completedAt ?? a.createdAt));
}

/* -------------------------------------------------------------------------- */
/* Messages and notifications                                                  */
/* -------------------------------------------------------------------------- */

const lastMessageAt = (t: Thread) => Date.parse(t.messages[t.messages.length - 1]?.at ?? "0");

/** The signed-in account's conversations on one side (ordering or making), newest first. */
export function threadsFor(s: DemoState, role: Role): Thread[] {
  const ids = activeIds(s);
  return s.threads
    .filter((t) => (role === "business" ? t.businessId === ids.businessId : t.creatorId === ids.creatorId))
    .filter((t) => t.messages.length > 0)
    .sort((a, b) => lastMessageAt(b) - lastMessageAt(a));
}

/** All the signed-in account's conversations, with the side they're on in each. */
export function myThreads(s: DemoState): { thread: Thread; side: Role }[] {
  const ids = activeIds(s);
  return s.threads
    .filter((t) => t.messages.length > 0)
    .flatMap((thread) => {
      const side = thread.businessId === ids.businessId ? "business" : thread.creatorId === ids.creatorId ? "creator" : undefined;
      return side ? [{ thread, side: side as Role }] : [];
    })
    .sort((a, b) => lastMessageAt(b.thread) - lastMessageAt(a.thread));
}

/** Unread conversations: on one side, or across both when `role` is omitted. */
export const unreadThreadCount = (s: DemoState, role?: Role) =>
  myThreads(s).filter(({ thread, side }) => (!role || side === role) && thread.unread.includes(side)).length;

/** The signed-in account's notifications, newest first. */
export const notificationsFor = (s: DemoState) =>
  s.notifications
    .filter((n) => n.accountId === s.activeAccountId)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

export const unreadNotificationCount = (s: DemoState) =>
  s.notifications.filter((n) => n.accountId === s.activeAccountId && n.unread).length;

/* -------------------------------------------------------------------------- */
/* Money                                                                       */
/* -------------------------------------------------------------------------- */

/** Sums of nets carry cents ($125.60); keep them exact to the cent. */
const toCents = (amount: number) => Math.round(amount * 100) / 100;

/**
 * Creator money, all net of Yapp's 20% fee (what the creator actually receives): available to
 * withdraw, held in protection, pending campaign pay, lifetime, and the last 6 months.
 *
 * The seed only contains a creator's recent commissions, while seeded payouts (and the
 * creator's `completed` count) reflect earlier history. So: seeded payouts are treated as
 * paying out that earlier work, "available" = released earnings minus payouts made in this
 * browser, and lifetime/monthly figures add a deterministic estimate of the earlier work.
 */
export function creatorEarnings(s: DemoState, creatorId: string | undefined = activeIds(s).creatorId) {
  const creator = creatorId ? creatorById(s, creatorId) : undefined;
  const mine = creatorId ? s.commissions.filter((c) => c.creatorId === creatorId) : [];
  const earned = (c: Commission) => commissionTotals(c).creatorEarns;
  const released = mine.filter((c) => c.payment.status === "released");
  const releasedTotal = released.reduce((sum, c) => sum + earned(c), 0);
  const held = mine
    .filter((c) => c.payment.status === "held")
    .reduce((sum, c) => sum + earned(c), 0);
  /**
   * Approved campaign work, still held: released 7 days after the post is verified
   * (`withdrawableFrom`), if it's still live. Dated items first, soonest first.
   */
  const pendingItems = mine
    .filter((c) => c.payment.status === "pending")
    .sort(
      (a, b) =>
        Date.parse(a.withdrawableFrom ?? "9999-12-31") - Date.parse(b.withdrawableFrom ?? "9999-12-31") ||
        Date.parse(b.completedAt ?? b.createdAt) - Date.parse(a.completedAt ?? a.createdAt),
    );
  const pending = pendingItems.reduce((sum, c) => sum + earned(c), 0);
  const pendingWaiting = pendingItems
    .filter((c) => !(c.post?.status === "live" && c.withdrawableFrom))
    .reduce((sum, c) => sum + earned(c), 0);
  const seededPayoutIds = new Set(seedPayouts.map((p) => p.id));
  const newPayouts = s.payouts.filter((p) => p.creatorId === creatorId && !seededPayoutIds.has(p.id));
  // Released work a seeded payout already paid out (older history) isn't available again.
  const paidOut = new Set(
    s.payouts.filter((p) => p.creatorId === creatorId).flatMap((p) => p.commissionIds ?? []),
  );
  const unpaidReleased = released.filter((c) => !paidOut.has(c.id)).reduce((sum, c) => sum + earned(c), 0);
  const available = Math.max(0, toCents(unpaidReleased - newPayouts.reduce((sum, p) => sum + p.amount, 0)));

  // Earlier work, estimated from the creator's prices (net of the fee, like everything here).
  const typical = creator?.packages.length ? creatorNet(startingPrice(creator) * 1.4) : 0;
  const earlierCount = Math.max(0, (creator?.completed ?? 0) - released.length);
  const lifetime = Math.round((earlierCount * typical + releasedTotal) / 10) * 10;

  // last 6 calendar months in display time, oldest first
  const monthKey = (iso: string) => localDay(Date.parse(iso)).slice(0, 7);
  const months: string[] = [];
  const [year, month] = monthKey(new Date(NOW).toISOString()).split("-").map(Number);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  const seed = (creatorId ?? "").split("").reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const monthly = months.map((key, index) => {
    const fromCommissions = released
      .filter((c) => monthKey(c.completedAt ?? c.createdAt) === key)
      .reduce((sum, c) => sum + earned(c), 0);
    // Earlier work for past months only (the current month shows real activity).
    const isCurrent = index === months.length - 1;
    const baseline =
      isCurrent || !creator?.completed ? 0 : Math.round((typical * (2 + ((seed >>> index) % 4))) / 10) * 10;
    return fromCommissions + baseline;
  });
  const monthLabels = months.map((key) =>
    new Date(`${key}-01T00:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
  );
  return {
    available,
    held: toCents(held),
    pending: toCents(pending),
    /** Part of `pending` with no release date yet: the post isn't verified, or it came down. */
    pendingWaiting: toCents(pendingWaiting),
    pendingItems,
    lifetime,
    thisMonth: toCents(monthly[monthly.length - 1]),
    monthly: monthly.map(toCents),
    monthLabels,
    completedCount: creator?.completed ?? released.length,
  };
}

/**
 * Business money, in listed prices (what the brand pays; no fee is ever added): currently held,
 * authorized, spent and this month. Campaigns count through their own hold (`campaignMoney`); their
 * slot commissions are left out so nothing is counted twice. Spent = released on approval (the
 * creator receives 80% of it, Yapp keeps 20%).
 */
export function businessSpend(s: DemoState, businessId: string = activeIds(s).businessId) {
  const mine = s.commissions.filter((c) => c.businessId === businessId && c.source !== "campaign");
  const campaigns = s.requests
    .filter((r) => r.businessId === businessId && isCampaign(r))
    .map((r) => campaignMoney(s, r));
  const campaignHeld = campaigns.reduce((sum, m) => sum + m.held, 0);
  const campaignSpent = campaigns.reduce((sum, m) => sum + m.spent, 0);
  const total = (c: Commission) => commissionTotals(c).total;
  const held = mine.filter((c) => c.payment.status === "held").reduce((a, c) => a + total(c), 0);
  const authorized = mine
    .filter((c) => c.payment.status === "authorized")
    .reduce((a, c) => a + total(c), 0);
  const released = mine.filter((c) => c.payment.status === "released");
  const spent = released.reduce((a, c) => a + total(c), 0);
  const thisMonthKey = new Date(NOW).toISOString().slice(0, 7);
  // Campaign slots released this month (their release date, or approval for older data).
  const campaignReleased = s.commissions.filter(
    (c) => c.businessId === businessId && c.source === "campaign" && c.payment.status === "released",
  );
  const campaignThisMonth = campaignReleased
    .filter((c) => (c.withdrawableFrom ?? c.completedAt ?? c.createdAt).slice(0, 7) === thisMonthKey)
    .reduce((a, c) => a + total(c), 0);
  const thisMonth =
    released
      .filter((c) => (c.completedAt ?? c.createdAt).slice(0, 7) === thisMonthKey)
      .reduce((a, c) => a + total(c), 0) + campaignThisMonth;
  return {
    held: held + campaignHeld,
    /** Of `held`, the part sitting in campaign holds. */
    campaignHeld,
    authorized,
    spent: spent + campaignSpent,
    thisMonth,
    completedCount: released.length,
  };
}

/** Receipts: one line per commission with money movement (campaigns: see `campaignReceipts`). */
export function receipts(s: DemoState, businessId: string = activeIds(s).businessId) {
  return s.commissions
    .filter((c) => c.businessId === businessId && c.source !== "campaign" && c.payment.status !== "authorized")
    .map((c) => ({
      id: `INV-${c.id.toUpperCase()}`,
      commission: c,
      creator: creatorById(s, c.creatorId),
      date: c.completedAt ?? c.acceptedAt ?? c.createdAt,
      ...commissionTotals(c),
      status: c.payment.status,
    }))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

/**
 * Campaign money movements (charge, top-ups, refunds) as receipt lines, newest first. Signed:
 * refunds are negative. `amount` is what moved on the card (listed prices, nothing added).
 */
export function campaignReceipts(s: DemoState, businessId: string = activeIds(s).businessId) {
  return s.requests
    .filter((r): r is ContentRequest & { campaign: NonNullable<ContentRequest["campaign"]> } =>
      r.businessId === businessId && Boolean(r.campaign),
    )
    .flatMap((request) =>
      request.campaign.ledger.map((entry, index) => {
        const sign = entry.kind === "refund" ? -1 : 1;
        return {
          // "INV-R-150-2": the campaign, then the line's place in its ledger.
          id: `INV-${request.id.toUpperCase()}-${index + 1}`,
          request,
          entry,
          date: entry.at,
          amount: sign * entry.amount,
        };
      }),
    )
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

/** A brand needs this many hires on Yapp before any reliability figure shows (else "—"). */
export const RELIABILITY_MIN_HIRES = 3;

export type ReliabilityFigureId = "paysOnTime" | "reviewSpeed" | "hireRate" | "autoApproved" | "sharesResults";

export type ReliabilityFigure = {
  id: ReliabilityFigureId;
  /** "Pays on time" */
  label: string;
  /** "100%", "9h", "2 days", or "—" until there is enough data. */
  value: string;
  /** False when `value` is "—". */
  known: boolean;
  /** One sentence for a tooltip or an info panel. */
  hint: string;
};

const hoursLabel = (hours: number) => (hours < 24 ? `${Math.round(hours)}h` : plural(Math.round(hours / 24), "day"));

/**
 * A brand's five reliability figures for creators (round 3 answers, item 20), in this order: Pays
 * on time, Review speed, Hire rate, Auto-approved, Shares results. Each is "—" until there is
 * enough data (a brand with fewer than 3 hires shows "—" everywhere). "Shares results" needs ad
 * accounts, which can't be connected yet, so it is always "—". No stars for brands.
 */
export function reliabilityFigures(business: Business | undefined): ReliabilityFigure[] {
  const r = business && business.hires >= RELIABILITY_MIN_HIRES ? business.reliability : undefined;
  const pct = (value: number | null | undefined) => (value === null || value === undefined ? undefined : `${Math.round(value)}%`);
  const rows: [ReliabilityFigureId, string, string | undefined, string][] = [
    ["paysOnTime", "Pays on time", pct(r?.paysOnTimePct), "Orders where the money was held from the start and released without a dispute."],
    [
      "reviewSpeed",
      "Review speed",
      r?.reviewHours === null || r?.reviewHours === undefined ? undefined : hoursLabel(r.reviewHours),
      "Typical time from a delivered version to the brand's approval or change request.",
    ],
    ["hireRate", "Hire rate", pct(r?.hireRatePct), "Custom orders that ended with someone hired."],
    [
      "autoApproved",
      "Auto-approved",
      pct(r?.timerApprovedPct),
      "Versions approved by the 3-day timer because the brand didn't respond. Lower is better.",
    ],
    ["sharesResults", "Shares results", undefined, "Shown once brands can connect an ad account."],
  ];
  return rows.map(([id, label, value, hint]) => ({ id, label, value: value ?? "—", known: value !== undefined, hint }));
}

/**
 * The reliability figures in one line for compact places ("Pays on time 100% · Reviews in about 9h
 * · Hires 64% of the time · 0% auto-approved"), or undefined when none is known yet.
 */
export function reliabilitySummary(business: Business | undefined): string | undefined {
  const known = reliabilityFigures(business).filter((f) => f.known);
  if (!known.length) return undefined;
  const phrase: Record<ReliabilityFigureId, (v: string) => string> = {
    paysOnTime: (v) => `Pays on time ${v}`,
    reviewSpeed: (v) => `Reviews in about ${v}`,
    hireRate: (v) => `Hires ${v} of the time`,
    autoApproved: (v) => `${v} auto-approved`,
    sharesResults: (v) => `Shares results ${v}`,
  };
  return known.map((f) => phrase[f.id](f.value)).join(" · ");
}

/* -------------------------------------------------------------------------- */
/* Find work (Work spec 6.5): every open campaign and custom order, one list   */
/* -------------------------------------------------------------------------- */

export type WorkKind = "campaign" | "custom";
export type WorkSort = "recommended" | "closing" | "newest" | "pay-high" | "pay-low";

export type WorkQuery = {
  /** Default "all". */
  kind?: "all" | WorkKind;
  /** Brand, product, title or category; case-insensitive. */
  q?: string;
  /** Product categories, OR within the group. Empty = any. */
  categories?: NicheId[];
  /** Job types, OR within the group. Empty = any. */
  jobTypes?: JobType[];
  /** One video format, or "all" (default). Ad copy has no format, so any format filter leaves it out. */
  format?: FormatId | "all";
  /** One platform (the job includes it), or "any" (default). Ad copy has none. */
  platform?: PlatformId | "any";
  /** Listed pay at least this much (per Yapp for campaigns, the budget's top for custom orders). 0 = any. */
  minPay?: number;
  /** Closes within this many days (today counts). 0 = any time. */
  closingWithinDays?: number;
  /** Default "recommended". */
  sort?: WorkSort;
  /** 1-based (default 1; clamped to the last page). */
  page?: number;
  /** Default 12 (`WORK_PAGE_SIZE`). */
  pageSize?: number;
  /** Include orders this account dismissed from its feed (default false). */
  includeHidden?: boolean;
};

/** Why this viewer can't pick or pitch. */
export type WorkBlock =
  | "no_profile"
  | "own"
  | "closed"
  | "full"
  | "joined"
  | "excluded"
  | "no_account"
  | "unverified"
  | "below"
  | "above"
  | "pitched";

export type WorkAction = {
  kind: "pick" | "pitch";
  can: boolean;
  /** Default copy: "Pick now", "Pitch now", or why not ("All slots taken", "Create a creator profile to take work"). */
  label: string;
  reason?: WorkBlock;
  /** Pick only: the campaign platforms this creator qualifies on (choose one when picking). */
  platforms?: CampaignPlatformId[];
};

export type WorkPay = {
  unit: "per-yapp" | "budget";
  /** What the pay filter and sort use: the price per Yapp, or the top of the budget. */
  amount: number;
  min: number;
  max: number;
  /** The creator's net (80%) of `amount`, `min` and `max`. */
  net: number;
  netMin: number;
  netMax: number;
  /** "$140 per Yapp", "$200–350 budget". */
  label: string;
  /** "you earn $112", "you earn $160–280". */
  netLabel: string;
};

/** One open order, ready for a card or a list row. */
export type WorkItem = {
  id: string;
  kind: WorkKind;
  request: ContentRequest;
  business: Business;
  brandName: string;
  productName?: string;
  title: string;
  category: NicheId;
  jobType: JobType;
  /** Undefined for ad copy. */
  format?: FormatId;
  /** Campaigns: where creators may post. Custom orders: where the brand runs it. Empty for ad copy. */
  platforms: PlatformId[];
  /** Campaigns only. */
  tierId?: FollowerTierId;
  usage: UsageOptionId;
  /** Days to deliver version 1, set by the brand (undefined on older custom orders). */
  deadlineDays?: number;
  pay: WorkPay;
  /** Campaigns only. */
  slots?: { total: number; taken: number; left: number };
  /** Custom orders: pitches so far (0 for campaigns). */
  pitches: number;
  postedAt: string;
  closesAt: string;
  closesInDays: number;
  isNew: boolean;
  /** Invited to an invite-only custom order. */
  invited: boolean;
  hidden: boolean;
  /** Custom orders, for a viewer with a creator profile. */
  fit?: Fit;
  action: WorkAction;
  /** The viewer's slot on this campaign, or their pitch on this order. */
  mySlot?: Commission;
  myPitch?: Pitch;
};

export type WorkFacets = {
  /** The type bar: every other filter applied, not the kind. */
  kind: Record<WorkKind, number>;
  categories: Record<NicheId, number>;
  jobTypes: Record<JobType, number>;
  /** Video formats, plus "all" (every other filter applied, any format, ad copy included). */
  formats: Record<FormatId | "all", number>;
  platforms: Record<PlatformId | "any", number>;
  /** Keyed by threshold: 0 (any), 150, 300, 500. */
  minPay: Record<number, number>;
  /** Keyed by days: 0 (any time), 3, 7. */
  closingWithin: Record<number, number>;
};

export type WorkResult = {
  items: WorkItem[];
  /** Matches across every page. */
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  /** Each group's counts apply every other active filter but not its own (search always applies). */
  facets: WorkFacets;
  /** Open slots across the matching campaigns ("Yapps open"). */
  openSlots: number;
};

const blockLabel = (reason: WorkBlock, item: { platforms: PlatformId[] }): string => {
  switch (reason) {
    case "no_profile":
      return "Create a creator profile to take work";
    case "full":
      return "All slots taken";
    case "joined":
      return "You picked a slot";
    case "closed":
      return "Closed";
    case "own":
      return "Your order";
    case "excluded":
      return "Not open to you";
    case "no_account":
      return `Connect your ${platformList(item.platforms as CampaignPlatformId[])} to pick`;
    case "unverified":
      return "Verify your account to pick";
    case "below":
    case "above":
      return "Not in your follower tier";
    case "pitched":
      return "Pitch sent";
  }
};

function workPay(request: ContentRequest): WorkPay {
  if (request.campaign) {
    const price = request.campaign.pricePerVideo;
    const net = creatorNet(price);
    return {
      unit: "per-yapp",
      amount: price,
      min: price,
      max: price,
      net,
      netMin: net,
      netMax: net,
      label: `${money(price)} per Yapp`,
      netLabel: `you earn ${moneyExact(net)}`,
    };
  }
  const { min, max } = request.budget;
  return {
    unit: "budget",
    amount: max,
    min,
    max,
    net: creatorNet(max),
    netMin: creatorNet(min),
    netMax: creatorNet(max),
    label: `${moneyRange(min, max)} budget`,
    netLabel: `you earn ${netRange(min, max)}`,
  };
}

/** Every open order this viewer could look at, before any filter. */
function workCatalogue(s: DemoState): WorkItem[] {
  const ids = activeIds(s);
  const creator = ids.creatorId ? creatorById(s, ids.creatorId) : undefined;
  const hidden = s.hidden[s.activeAccountId] ?? [];
  const base = (request: ContentRequest) => {
    const business = businessById(s, request.businessId)!;
    const product = productById(s, request.brief.productId);
    const adCopy = isAdCopy(request);
    return {
      id: request.id,
      request,
      business,
      brandName: business?.name ?? "A brand",
      productName: product?.name,
      title: request.title,
      category: product?.niche ?? business?.industry ?? "consumer",
      jobType: jobTypeOf(request),
      format: adCopy ? undefined : request.brief.format,
      platforms: adCopy ? [] : request.campaign ? request.campaign.platforms : request.brief.platforms,
      usage: request.brief.usage,
      deadlineDays: deadlineDaysOf(request),
      pay: workPay(request),
      postedAt: request.postedAt,
      closesAt: request.closesAt,
      closesInDays: closesInDays(request),
      isNew: isNewOrder(request),
      hidden: hidden.includes(request.id),
    };
  };

  const customs: WorkItem[] = creator
    ? opportunities(s).map((o) => ({
        ...base(o.request),
        kind: "custom" as const,
        pitches: o.pitchCount,
        invited: o.invited,
        fit: o.fit,
        myPitch: o.pitch,
        action: o.pitch
          ? { kind: "pitch" as const, can: false, reason: "pitched" as const, label: blockLabel("pitched", { platforms: [] }) }
          : { kind: "pitch" as const, can: true, label: "Pitch now" },
      }))
    : s.requests
        .filter((r) => !isCampaign(r) && r.businessId !== ids.businessId && r.status === "open" && r.visibility === "public")
        .map((request) => ({
          ...base(request),
          kind: "custom" as const,
          pitches: pitchesForRequest(s, request.id).length,
          invited: false,
          action: { kind: "pitch" as const, can: false, reason: "no_profile" as const, label: blockLabel("no_profile", { platforms: [] }) },
        }));

  const campaigns: WorkItem[] = openCampaigns(s).map((o) => {
    const item = base(o.request);
    const total = o.request.slots;
    const left = o.openSlots;
    const reason = o.eligibility.ok ? undefined : (o.eligibility.reason as WorkBlock);
    return {
      ...item,
      kind: "campaign" as const,
      tierId: o.request.campaign?.tierId,
      slots: { total, taken: total - left, left },
      pitches: 0,
      invited: false,
      mySlot: o.slot,
      action: o.eligibility.ok
        ? { kind: "pick" as const, can: true, label: PICK_NOW, platforms: o.eligibility.platforms }
        : { kind: "pick" as const, can: false, reason, label: blockLabel(reason!, item) },
    };
  });

  return [...campaigns, ...customs];
}

type WorkFilterKey = "kind" | "categories" | "jobTypes" | "format" | "platform" | "minPay" | "closing";

function matches(item: WorkItem, query: WorkQuery, skip?: WorkFilterKey): boolean {
  const kind = query.kind ?? "all";
  if (skip !== "kind" && kind !== "all" && item.kind !== kind) return false;
  if (skip !== "categories" && query.categories?.length && !query.categories.includes(item.category)) return false;
  if (skip !== "jobTypes" && query.jobTypes?.length && !query.jobTypes.includes(item.jobType)) return false;
  if (skip !== "format" && query.format && query.format !== "all" && item.format !== query.format) return false;
  if (skip !== "platform" && query.platform && query.platform !== "any" && !item.platforms.includes(query.platform)) return false;
  if (skip !== "minPay" && query.minPay && item.pay.amount < query.minPay) return false;
  if (
    skip !== "closing" &&
    query.closingWithinDays &&
    !(item.closesInDays >= 0 && item.closesInDays <= query.closingWithinDays)
  )
    return false;
  return true;
}

function matchesSearch(item: WorkItem, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    item.brandName,
    item.productName ?? "",
    item.title,
    nicheById[item.category].name,
    item.format ? formatById[item.format].name : "",
    jobTypes.find((j) => j.id === item.jobType)?.name ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return needle.split(/\s+/).every((word) => hay.includes(word));
}

/** Recommended: invited first, then new, then what this viewer can act on, then fit, then closing soonest. */
function relevance(item: WorkItem, creator: Creator | undefined): number {
  let score = 0;
  if (item.invited) score += 1000;
  if (item.isNew) score += 400;
  if (item.action.can) score += 200;
  if (item.fit) score += item.fit.score;
  else if (item.kind === "campaign") score += item.action.can ? 70 : 30;
  if (creator?.niches.includes(item.category)) score += 15;
  return score;
}

/**
 * Find work: every open UGC campaign and custom order this account could look at (its own orders,
 * drafts, closed and hired orders, and invite-only orders it isn't invited to are left out), as cards
 * a page renders directly, filtered, sorted and paged, with facet counts. Built on `opportunities()`
 * (custom orders and fit), `openCampaigns()` (slots and eligibility) and `fit()`. An account without
 * a creator profile sees the public orders with `action.can: false` ("Create a creator profile to
 * take work"). Full campaigns stay listed with "All slots taken".
 */
export function findWork(s: DemoState, query: WorkQuery = {}): WorkResult {
  const creator = me.creator(s);
  const all = workCatalogue(s).filter((item) => (query.includeHidden || !item.hidden) && matchesSearch(item, query.q ?? ""));
  const count = (skip: WorkFilterKey, test: (item: WorkItem) => boolean) =>
    all.filter((item) => matches(item, query, skip) && test(item)).length;

  const facets: WorkFacets = {
    kind: {
      campaign: count("kind", (i) => i.kind === "campaign"),
      custom: count("kind", (i) => i.kind === "custom"),
    },
    categories: Object.fromEntries(niches.map((n) => [n.id, count("categories", (i) => i.category === n.id)])) as Record<NicheId, number>,
    jobTypes: Object.fromEntries(jobTypes.map((j) => [j.id, count("jobTypes", (i) => i.jobType === j.id)])) as Record<JobType, number>,
    formats: {
      all: count("format", () => true),
      ...Object.fromEntries(videoFormats.map((f) => [f.id, count("format", (i) => i.format === f.id)])),
      "ad-copy": 0,
    } as Record<FormatId | "all", number>,
    platforms: {
      any: count("platform", () => true),
      ...Object.fromEntries(allPlatforms.map((p) => [p.id, count("platform", (i) => i.platforms.includes(p.id))])),
    } as Record<PlatformId | "any", number>,
    minPay: Object.fromEntries([0, ...WORK_PAY_STEPS].map((v) => [v, count("minPay", (i) => i.pay.amount >= v)])),
    closingWithin: Object.fromEntries(
      [0, ...WORK_CLOSING_STEPS].map((d) => [d, count("closing", (i) => d === 0 || (i.closesInDays >= 0 && i.closesInDays <= d))]),
    ),
  };

  const matched = all.filter((item) => matches(item, query));
  const sort = query.sort ?? "recommended";
  const byClosing = (a: WorkItem, b: WorkItem) => Date.parse(a.closesAt) - Date.parse(b.closesAt);
  const byNewest = (a: WorkItem, b: WorkItem) => Date.parse(b.postedAt) - Date.parse(a.postedAt);
  matched.sort((a, b) => {
    switch (sort) {
      case "closing":
        return byClosing(a, b) || byNewest(a, b);
      case "newest":
        return byNewest(a, b);
      case "pay-high":
        return b.pay.amount - a.pay.amount || byClosing(a, b);
      case "pay-low":
        return a.pay.amount - b.pay.amount || byClosing(a, b);
      default:
        return relevance(b, creator) - relevance(a, creator) || byClosing(a, b) || a.id.localeCompare(b.id);
    }
  });

  const pageSize = Math.max(1, query.pageSize ?? WORK_PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(matched.length / pageSize));
  const page = Math.min(Math.max(1, Math.floor(query.page ?? 1)), pageCount);
  return {
    items: matched.slice((page - 1) * pageSize, page * pageSize),
    total: matched.length,
    page,
    pageSize,
    pageCount,
    facets,
    openSlots: matched.reduce((n, item) => n + (item.slots?.left ?? 0), 0),
  };
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

export const isOverdue = (iso: string) => daysFromNow(iso) < 0;
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
