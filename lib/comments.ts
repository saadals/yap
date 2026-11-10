/**
 * Pure rules for comments on delivered versions, shared by the store (actions) and the selectors
 * (interface). Site-wide spec 5.5.4 as ruled by the round 3 answers (G1, items 14 and 27):
 *
 * - Either side comments on any version while the order is open, and for 30 days after it completes;
 *   then comments are read-only. A cancelled or declined order is read-only at once.
 * - A comment is timestamped (`atSec`) or general (`atSec: null`); ad copy is always general.
 *   Replies go one level deep.
 * - Either side resolves; only the business re-opens. An author edits or deletes (soft) their own
 *   comment or reply, on the latest version only.
 * - Comments never stop the review timer, and are private to the two sides.
 * - Each comment and reply carries `unread` until the other side opens the order.
 */

import { NOW, addDays } from "./clock";
import { COMMENTS_OPEN_DAYS } from "./taxonomy";
import type { Commission, CommentReply, Delivery, DeliveryComment, Role } from "./types";

/** When comments become read-only: 30 days after completion (undefined = still open, no date yet). */
export function commentsCloseAt(c: Pick<Commission, "status" | "completedAt">): string | undefined {
  if (c.status === "completed" && c.completedAt) return addDays(c.completedAt, COMMENTS_OPEN_DAYS);
  return undefined;
}

/**
 * Can anyone still comment on this order? Open while it runs, read-only once cancelled or declined,
 * and for 30 days after completion. `now` defaults to the fixed demo clock (safe in render).
 */
export function commentsOpen(c: Pick<Commission, "status" | "completedAt">, now: number = NOW): boolean {
  if (c.status === "cancelled" || c.status === "declined" || c.status === "offered") return false;
  const closes = commentsCloseAt(c);
  return closes ? Date.parse(closes) > now : true;
}

/** Ad copy has no video, so its comments are always general. */
export const commentsAreGeneralOnly = (delivery: Pick<Delivery, "kind">) => delivery.kind === "text";

export const isLatestDelivery = (c: Pick<Commission, "deliveries">, deliveryId: string) =>
  c.deliveries[c.deliveries.length - 1]?.id === deliveryId;

/** Visible comments: not deleted, or deleted but with replies still standing ("Comment deleted"). */
export const visibleComments = (delivery: Delivery): DeliveryComment[] =>
  delivery.comments.filter((m) => !m.deletedAt || m.replies.some((r) => !r.deletedAt));

/** Live replies of a comment. */
export const visibleReplies = (comment: DeliveryComment): CommentReply[] =>
  comment.replies.filter((r) => !r.deletedAt);

/** Open comments (not resolved, not deleted): what "Request changes" offers to send. */
export const openComments = (delivery: Delivery): DeliveryComment[] =>
  delivery.comments.filter((m) => !m.resolved && !m.deletedAt);

/** Comments sent to the creator with a change request on this version. */
export const requestedComments = (delivery: Delivery): DeliveryComment[] =>
  delivery.comments.filter((m) => m.requestedAt && !m.deletedAt);

/** Counts for a version's header: "4 comments · 3 open · 1 done". Replies don't count as comments. */
export function commentCounts(delivery: Delivery) {
  const live = delivery.comments.filter((m) => !m.deletedAt);
  const open = live.filter((m) => !m.resolved).length;
  return { total: live.length, open, resolved: live.length - open, replies: live.reduce((n, m) => n + visibleReplies(m).length, 0) };
}

/** Comments and replies the given side hasn't seen yet on one version (the other side wrote them). */
export function unreadOn(delivery: Delivery, side: Role): number {
  let count = 0;
  for (const m of delivery.comments) {
    if (m.unread && m.author !== side && !m.deletedAt) count += 1;
    for (const r of m.replies) if (r.unread && r.author !== side && !r.deletedAt) count += 1;
  }
  return count;
}

/** Unread comments and replies across every version, for a badge on the order. */
export const unreadComments = (c: Pick<Commission, "deliveries">, side: Role) =>
  c.deliveries.reduce((n, d) => n + unreadOn(d, side), 0);

/**
 * Unread replies by the other side in threads `side` started: drives "{Brand} replied to your
 * comment" in Work's "Needs you" (creator side).
 */
export function unreadRepliesTo(c: Pick<Commission, "deliveries">, side: Role) {
  const out: { delivery: Delivery; comment: DeliveryComment; reply: CommentReply }[] = [];
  for (const delivery of c.deliveries) {
    for (const comment of delivery.comments) {
      if (comment.author !== side || comment.deletedAt) continue;
      for (const reply of comment.replies) {
        if (reply.unread && reply.author !== side && !reply.deletedAt) out.push({ delivery, comment, reply });
      }
    }
  }
  return out.sort((a, b) => Date.parse(b.reply.createdAt) - Date.parse(a.reply.createdAt));
}

/** Who may do what on one version, for the side that's looking. */
export function commentPermissions(c: Commission, delivery: Delivery, side: Role | undefined) {
  const open = Boolean(side) && commentsOpen(c);
  const latest = isLatestDelivery(c, delivery.id);
  return {
    /** Add a comment or reply (any version). */
    canComment: open,
    /** Timestamped comments need a video. */
    canTimestamp: open && !commentsAreGeneralOnly(delivery),
    canResolve: open,
    canReopen: open && side === "business",
    /** Edit or delete your own comment or reply: latest version only. */
    canEditOwn: open && latest,
    /** "Request changes" sends open comments on the latest version while it's in review. */
    canRequestChanges: side === "business" && latest && c.status === "delivered" && delivery.status === "in_review",
  };
}
