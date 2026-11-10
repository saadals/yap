/**
 * What needs the signed-in account, per side of the marketplace. Both Home pages list these, and
 * the mode switch shows a count for the side you're not looking at, so nothing waits unseen.
 *
 * Ported from V1's components/work/needs-you.ts (which picked one item across both sides); V2
 * returns every item for one side, most urgent first:
 *   tier 0: someone is waiting on you (a delivery to review, an offer, changes to make)
 *   tier 1: your own work to move (a version or a post due)
 *   tier 2: decisions on your orders (pitches to read, a shortlist, a draft)
 *   tier 3: follow-ups (a review to leave, a shortlisted pitch of yours)
 */
import { addDays } from "./clock";
import { dueLabel, money, plural, timeAgo, weekdayDate } from "./format";
import { paths } from "./paths";
import {
  businessById,
  campaignAttention,
  campaignSlots,
  commissionTotals,
  commissionsForBusiness,
  commissionsForCreator,
  creatorById,
  latestDelivery,
  pitchesForCreator,
  pitchesForRequest,
  requestById,
  requestsForBusiness,
} from "./selectors";
import type { DemoState } from "./store";
import { AUTO_APPROVE_DAYS, formatById } from "./taxonomy";
import type { Commission, Role } from "./types";

export type AttentionKind =
  | "review" // a delivery to review
  | "review-copies" // campaign review copies to review
  | "pitches" // unread pitches on an open request
  | "shortlist" // a shortlisted pitch to decide on
  | "draft" // an order saved but not posted
  | "rate" // a finished job without a review
  | "offer" // a direct offer to accept or decline
  | "changes" // the client asked for changes
  | "post" // an approved campaign video to post (or put back up)
  | "deliver" // a version to make and upload
  | "shortlisted"; // your pitch was shortlisted

export type AttentionItem = {
  side: Role;
  kind: AttentionKind;
  tier: 0 | 1 | 2 | 3;
  /** Short context ("Ready for review", "New offer"). */
  eyebrow: string;
  title: string;
  /** One supporting line. */
  line: string;
  /** Verb for the row's single action. */
  action: string;
  href: string;
  /** Deadline-ish time used to order items within a tier (earliest first). */
  at: number;
  commissionId?: string;
  requestId?: string;
  /** Who the item is about (a face for the row): a creator id or a business id. */
  creatorId?: string;
  businessId?: string;
};

const possessive = (name: string) => (name.endsWith("s") ? `${name}'` : `${name}'s`);

/** timeAgo, lower-cased for mid-sentence use ("yesterday", "3h ago", "Nov 7"). */
export const agoLower = (iso: string) => {
  const ago = timeAgo(iso);
  return ago === "Yesterday" ? "yesterday" : ago;
};

/** Pitches the business hasn't opened yet. */
export const unreadPitches = (s: DemoState, requestId: string) =>
  pitchesForRequest(s, requestId).filter((p) => p.status === "sent");

/** When a delivery in review approves itself if the business doesn't respond. */
export const autoApproveAt = (c: Commission) =>
  c.autoApproveAt ??
  (latestDelivery(c) ? addDays(latestDelivery(c)!.deliveredAt, AUTO_APPROVE_DAYS) : c.dueDate);

function ordering(s: DemoState): AttentionItem[] {
  const out: AttentionItem[] = [];

  for (const c of commissionsForBusiness(s).filter((x) => x.status === "delivered" && x.source !== "campaign")) {
    const who = creatorById(s, c.creatorId)?.firstName ?? "your creator";
    const delivery = latestDelivery(c);
    const auto = autoApproveAt(c);
    out.push({
      side: "business",
      kind: "review",
      tier: 0,
      at: Date.parse(auto),
      eyebrow: "Ready for review",
      title: `Review ${possessive(who)} ${formatById[c.brief.format].noun[0]}`,
      line: [
        delivery ? `Version ${delivery.version} arrived ${agoLower(delivery.deliveredAt)}.` : "",
        `Approves itself ${weekdayDate(auto)}.`,
      ]
        .filter(Boolean)
        .join(" "),
      action: "Review",
      href: paths.job(c.id),
      commissionId: c.id,
      creatorId: c.creatorId,
    });
  }

  for (const { request, progress } of campaignAttention(s)) {
    const waiting = campaignSlots(s, request)
      .map((view) => view.commission)
      .filter((c): c is Commission => c?.status === "delivered");
    const first = waiting.map((c) => Date.parse(autoApproveAt(c))).sort((a, b) => a - b)[0];
    out.push({
      side: "business",
      kind: "review-copies",
      tier: 0,
      at: first ?? Number.POSITIVE_INFINITY,
      eyebrow: "Campaign",
      title:
        progress.review === 1 ? "A review copy is ready" : `${progress.review} review copies are ready`,
      line: `On “${request.title}”. Each one approves itself 3 days after upload.`,
      action: progress.review === 1 ? "Review it" : "Review them",
      href: paths.order(request.id),
      requestId: request.id,
      businessId: request.businessId,
    });
  }

  const requests = requestsForBusiness(s);
  const open = requests.filter((r) => r.status === "open" && r.kind !== "campaign");

  for (const request of open) {
    const unread = unreadPitches(s, request.id);
    if (!unread.length) continue;
    out.push({
      side: "business",
      kind: "pitches",
      tier: 2,
      at: -unread.length,
      eyebrow: "New pitches",
      title: `${plural(unread.length, "new pitch", "new pitches")} to read`,
      line: `On “${request.title}”.`,
      action: "Read pitches",
      href: paths.order(request.id),
      requestId: request.id,
      creatorId: unread[0].creatorId,
    });
  }

  const shortlisted = open
    .flatMap((request) =>
      pitchesForRequest(s, request.id)
        .filter((p) => p.status === "shortlisted")
        .map((pitch) => ({ pitch, request })),
    )
    .sort((a, b) => Date.parse(a.pitch.sentAt) - Date.parse(b.pitch.sentAt));
  for (const { pitch, request } of shortlisted.slice(0, 2)) {
    const who = creatorById(s, pitch.creatorId)?.firstName ?? "your shortlisted creator";
    out.push({
      side: "business",
      kind: "shortlist",
      tier: 2,
      at: Date.parse(pitch.sentAt),
      eyebrow: "Shortlist",
      title: `Decide on ${possessive(who)} pitch`,
      line: `${money(pitch.price)} for “${request.title}”.`,
      action: "Decide",
      href: paths.order(request.id, { pitch: pitch.id }),
      requestId: request.id,
      creatorId: pitch.creatorId,
    });
  }

  for (const draft of requests.filter((r) => r.status === "draft")) {
    out.push({
      side: "business",
      kind: "draft",
      tier: 2,
      at: Date.parse(draft.postedAt),
      eyebrow: "Draft",
      title: "Finish your draft",
      line: `“${draft.title}” is saved but not posted.`,
      action: "Finish draft",
      href: draft.kind === "campaign" ? paths.order(draft.id) : paths.newOrder({ draft: draft.id }),
      requestId: draft.id,
    });
  }

  for (const c of commissionsForBusiness(s).filter(
    (x) => x.status === "completed" && !x.reviewId && x.source !== "campaign",
  )) {
    const who = creatorById(s, c.creatorId)?.firstName ?? "your creator";
    out.push({
      side: "business",
      kind: "rate",
      tier: 3,
      at: -Date.parse(c.completedAt ?? c.createdAt),
      eyebrow: "Finished",
      title: `How did ${who} do?`,
      line: `A review helps ${who} and saves what worked for next time.`,
      action: "Leave a review",
      href: paths.job(c.id),
      commissionId: c.id,
      creatorId: c.creatorId,
    });
  }

  return out;
}

function studio(s: DemoState): AttentionItem[] {
  const out: AttentionItem[] = [];
  for (const c of commissionsForCreator(s)) {
    const business = businessById(s, c.businessId)?.name ?? "Your client";
    const slot = c.source === "campaign";
    const base = { side: "creator" as const, commissionId: c.id, businessId: c.businessId, href: paths.job(c.id) };
    if (c.status === "offered") {
      out.push({
        ...base,
        kind: "offer",
        tier: 0,
        at: Date.parse(c.createdAt),
        eyebrow: "New offer",
        title: `${business} wants ${plural(c.brief.videoCount, "video")}`,
        line: `${money(commissionTotals(c).creatorEarns)} · ${c.title}`,
        action: "Review the offer",
      });
    } else if (c.status === "revision") {
      out.push({
        ...base,
        kind: "changes",
        tier: 0,
        at: Date.parse(c.dueDate),
        eyebrow: "Changes requested",
        title: `${business} asked for changes`,
        line: slot ? c.title : `${c.title} · ${dueLabel(c.dueDate).text}`,
        action: "See their notes",
      });
    } else if (slot && c.status === "completed" && (c.post?.status === "due" || c.post?.status === "removed")) {
      const removed = c.post.status === "removed";
      out.push({
        ...base,
        kind: "post",
        tier: 1,
        at: Date.parse(c.withdrawableFrom ?? c.completedAt ?? c.createdAt),
        eyebrow: removed ? "Post taken down" : "Post due",
        title: removed ? `Put your ${business} post back up` : `Post your video for ${business}`,
        line: removed
          ? `${money(c.price)} is on hold until it's back up.`
          : `${money(c.price)} is released 7 days after we verify the post.`,
        action: removed ? "See what to do" : "Post it",
      });
    } else if (c.status === "in_progress") {
      out.push({
        ...base,
        kind: "deliver",
        tier: 1,
        at: Date.parse(c.dueDate),
        eyebrow: slot ? "Campaign" : "Next delivery",
        title: slot ? `Film your review copy for ${business}` : `Deliver to ${business}`,
        line: slot ? c.title : `${c.title} · ${dueLabel(c.dueDate).text}`,
        action: slot ? "Upload review copy" : "Open the job",
      });
    }
  }

  for (const pitch of pitchesForCreator(s).filter((p) => p.status === "shortlisted")) {
    const request = requestById(s, pitch.requestId);
    const business = request ? businessById(s, request.businessId)?.name : undefined;
    out.push({
      side: "creator",
      kind: "shortlisted",
      tier: 3,
      at: Date.parse(pitch.sentAt),
      eyebrow: "Shortlisted",
      title: `You're on ${business ? possessive(business) : "a"} shortlist`,
      line: request?.title ?? "Your pitch made the cut.",
      action: "View your pitch",
      href: paths.order(pitch.requestId),
      requestId: pitch.requestId,
      businessId: request?.businessId,
    });
  }
  return out;
}

/** Everything that needs this account on one side, most urgent first. */
export function attention(s: DemoState, side: Role): AttentionItem[] {
  const items = side === "business" ? ordering(s) : studio(s);
  return items.sort((a, b) => a.tier - b.tier || a.at - b.at);
}

/** How many items on a side have someone waiting (tiers 0 and 1): the mode switch's count. */
export const urgentCount = (s: DemoState, side: Role) =>
  attention(s, side).filter((item) => item.tier <= 1).length;
