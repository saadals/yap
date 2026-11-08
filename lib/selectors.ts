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
} from "./campaigns";
import { DAY, NOW } from "./clock";
import { cities, payouts as seedPayouts } from "./data";
import { daysFromNow, priceBreakdown } from "./format";
import type { DemoState } from "./store";
import { activeAccount, activeIds } from "./store";
import { countries, formatById, languageById, nicheById } from "./taxonomy";
import type {
  Commission,
  CommissionStatus,
  ContentRequest,
  Creator,
  Delivery,
  Pitch,
  Role,
  Settings,
  Thread,
  Video,
} from "./types";

export {
  campaignMoney,
  campaignProgress,
  campaignSlots,
  eligibility,
  isCampaign,
  mySlot,
  openSlotCount,
  slotHistory,
} from "./campaigns";
export type { Eligibility, IneligibleReason, SlotView } from "./campaigns";

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
/** "Dubai, UAE" */
export function cityLabel(id: string): string {
  const city = cityById(id);
  return city ? `${city.name}, ${countries[city.countryId].name}` : id;
}

/** Portfolio videos and delivery videos alike. */
export function videoById(s: DemoState, id: string): Video | undefined {
  const portfolio = s.videos.find((v) => v.id === id);
  if (portfolio) return portfolio;
  for (const c of s.commissions) {
    const delivery = c.deliveries.find((d) => d.video.id === id);
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
  /** The request wizard's autosaved draft for this account. */
  draft: (s: DemoState) => s.requestDrafts[s.activeAccountId] ?? null,
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
    reasons.push(`Speaks ${langMatches.map((l) => languageById[l].short).join(" and ")}`);
  } else if (langMatches.length) {
    score += 18;
    reasons.push(`Speaks ${langMatches.map((l) => languageById[l].short).join(", ")}`);
    gaps.push(
      `Doesn't list ${brief.languages
        .filter((l) => !creator.languages.includes(l))
        .map((l) => languageById[l].short)
        .join(", ")}`,
    );
  } else {
    gaps.push(`Doesn't list ${brief.languages.map((l) => languageById[l].short).join(" or ")}`);
  }

  if (creator.formats.includes(brief.format)) {
    score += 22;
    const made = portfolio(s, creator).filter((v) => v.format === brief.format).length;
    reasons.push(
      made
        ? `${made} ${formatById[brief.format].name.toLowerCase()}${made === 1 ? "" : "s"} in portfolio`
        : `Offers ${formatById[brief.format].name.toLowerCase()}s`,
    );
  } else {
    gaps.push(`Hasn't listed ${formatById[brief.format].name.toLowerCase()}s`);
  }

  const product = s.products.find((p) => p.id === brief.productId);
  if (product && creator.niches.includes(product.niche)) {
    score += 12;
    reasons.push(`Works with ${nicheById[product.niche].name.toLowerCase()} products`);
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
/* Requests and pitches                                                        */
/* -------------------------------------------------------------------------- */

/** Orders a buyer profile placed (custom requests and campaigns), newest first. */
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
 * Open custom requests a creator can pitch on (public or invited), best fit first. Excludes UGC
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

/**
 * Creator money: available to withdraw, held in protection, lifetime, and the last 6 months.
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
  /** Approved campaign work: in the wallet, withdrawable at month end if the post stays up. */
  const pendingItems = mine.filter((c) => c.payment.status === "pending");
  const pending = pendingItems.reduce((sum, c) => sum + earned(c), 0);
  const pendingLocked = pendingItems
    .filter((c) => c.post?.status !== "live")
    .reduce((sum, c) => sum + earned(c), 0);
  const seededPayoutIds = new Set(seedPayouts.map((p) => p.id));
  const newPayouts = s.payouts.filter((p) => p.creatorId === creatorId && !seededPayoutIds.has(p.id));
  const available = Math.max(0, releasedTotal - newPayouts.reduce((sum, p) => sum + p.amount, 0));

  const typical = creator?.packages.length ? startingPrice(creator) * 1.4 : 0;
  const earlierCount = Math.max(0, (creator?.completed ?? 0) - released.length);
  const lifetime = Math.round((earlierCount * typical + releasedTotal) / 10) * 10;

  // last 6 calendar months, oldest first
  const monthKey = (iso: string) => iso.slice(0, 7);
  const months: string[] = [];
  const now = new Date(NOW);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
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
    new Date(`${key}-01T00:00:00Z`).toLocaleString("en-GB", { month: "short", timeZone: "UTC" }),
  );
  return {
    available,
    held,
    pending,
    /** Part of `pending` whose post isn't live (yet), so it won't unlock at month end as things stand. */
    pendingLocked,
    pendingItems,
    lifetime,
    thisMonth: monthly[monthly.length - 1],
    monthly,
    monthLabels,
    completedCount: creator?.completed ?? released.length,
  };
}

/**
 * Business money: currently protected, spent, and fees. Campaigns count through their own hold
 * (`campaignMoney`); their slot commissions are left out so nothing is counted twice.
 */
export function businessSpend(s: DemoState, businessId: string = activeIds(s).businessId) {
  const mine = s.commissions.filter((c) => c.businessId === businessId && c.source !== "campaign");
  const campaigns = s.requests
    .filter((r) => r.businessId === businessId && isCampaign(r))
    .map((r) => campaignMoney(s, r));
  const campaignHeld = campaigns.reduce((sum, m) => sum + m.held, 0);
  const campaignPaid = campaigns.reduce((sum, m) => sum + m.paidOut, 0);
  const total = (c: Commission) => commissionTotals(c).total;
  const held = mine.filter((c) => c.payment.status === "held").reduce((a, c) => a + total(c), 0);
  const authorized = mine
    .filter((c) => c.payment.status === "authorized")
    .reduce((a, c) => a + total(c), 0);
  const released = mine.filter((c) => c.payment.status === "released");
  const spent = released.reduce((a, c) => a + total(c), 0);
  const fees = released.reduce((a, c) => a + commissionTotals(c).fee, 0);
  const thisMonthKey = new Date(NOW).toISOString().slice(0, 7);
  const campaignThisMonth = s.commissions
    .filter(
      (c) =>
        c.businessId === businessId &&
        c.source === "campaign" &&
        (c.payment.status === "pending" || c.payment.status === "released") &&
        (c.completedAt ?? c.createdAt).slice(0, 7) === thisMonthKey,
    )
    .reduce((a, c) => a + c.price, 0);
  const thisMonth =
    released
      .filter((c) => (c.completedAt ?? c.createdAt).slice(0, 7) === thisMonthKey)
      .reduce((a, c) => a + total(c), 0) + campaignThisMonth;
  return {
    held: held + campaignHeld,
    /** Of `held`, the part sitting in campaign holds. */
    campaignHeld,
    authorized,
    spent: spent + campaignPaid,
    fees,
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

/** Campaign money movements (hold, top-ups, refunds) as receipt lines, newest first. */
export function campaignReceipts(s: DemoState, businessId: string = activeIds(s).businessId) {
  return s.requests
    .filter((r): r is ContentRequest & { campaign: NonNullable<ContentRequest["campaign"]> } =>
      r.businessId === businessId && Boolean(r.campaign),
    )
    .flatMap((request) =>
      request.campaign.ledger.map((entry) => ({
        id: `INV-${request.id.toUpperCase()}-${entry.id.slice(-4).toUpperCase()}`,
        request,
        entry,
        date: entry.at,
        amount: entry.kind === "refund" ? -entry.amount : entry.amount,
      })),
    )
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

export const isOverdue = (iso: string) => daysFromNow(iso) < 0;
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
