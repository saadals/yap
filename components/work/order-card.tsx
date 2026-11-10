"use client";

import { Clock, FileText, MessageCircle } from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { CommissionBadge, SlotBadge } from "@/components/domain/status-badge";
import { VideoThumb } from "@/components/domain/video-thumb";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { commentCounts, unreadComments } from "@/lib/comments";
import { dueLabel, money, moneyExact, shortDate, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import {
  businessById,
  commissionTotals,
  creatorById,
  featuredVideo,
  isAdCopy,
  latestDelivery,
} from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import type { Commission, Role } from "@/lib/types";

type DueLook = "late" | "soon" | "ok" | "muted";

/** The order card's due line, from the viewer's side: what's next and by when. */
function dueLine(c: Commission, side: Role, otherFirstName: string): { text: string; look: DueLook } {
  const slot = c.source === "campaign";
  if (c.status === "delivered") {
    const auto = c.autoApproveAt ?? c.dueDate;
    return { text: `Auto-approves ${weekdayDate(auto)}`, look: side === "business" ? "soon" : "muted" };
  }
  if (c.status === "offered") {
    return side === "business"
      ? { text: `Waiting for ${otherFirstName}`, look: "muted" }
      : { text: `Due ${shortDate(c.dueDate)} if you accept`, look: "muted" };
  }
  if (c.status === "completed") {
    if (slot) {
      if (c.post?.status === "live")
        return c.payment.status === "pending" && c.withdrawableFrom
          ? { text: `Post verified · paid ${shortDate(c.withdrawableFrom)}`, look: "muted" }
          : { text: "Post verified", look: "muted" };
      if (c.post?.status === "checking") return { text: "Checking your post", look: "muted" };
      if (c.post?.status === "removed") return { text: "Put the post back up", look: "late" };
      return side === "creator" ? { text: "Post it to unlock your pay", look: "soon" } : { text: "Post due", look: "muted" };
    }
    return { text: c.completedAt ? `Completed ${shortDate(c.completedAt)}` : "Completed", look: "muted" };
  }
  if (c.status === "cancelled") return { text: slot ? "Slot ended" : "Cancelled", look: "muted" };
  if (c.status === "declined") return { text: "Declined", look: "muted" };
  if (c.status === "disputed") return { text: "In a dispute", look: "late" };
  if (slot && c.status === "in_progress" && c.deliveries.length === 0) {
    const due = dueLabel(c.dueDate);
    return { text: `Upload by ${weekdayDate(c.dueDate)}`, look: due.urgency };
  }
  const due = dueLabel(c.dueDate);
  return { text: due.text, look: due.urgency };
}

/**
 * One order in Ordered or Making (the preview's `.cm`): cover, status chip, comment badge (a dot
 * when something is unread), title, the other party, the due line, and the price for a brand or
 * the net for a creator. The whole card opens the order at /work/[id].
 */
export function OrderCard({ commission: c, side }: { commission: Commission; side: Role }) {
  const s = useDemo();
  const creator = creatorById(s, c.creatorId);
  const business = businessById(s, c.businessId);
  const delivery = latestDelivery(c);
  const cover = delivery?.video ?? (creator ? featuredVideo(s, creator) : undefined);
  const adCopy = isAdCopy(c);
  const comments = c.deliveries.reduce((n, d) => n + commentCounts(d).total, 0);
  const unread = unreadComments(c, side) > 0;
  const totals = commissionTotals(c);
  const due = dueLine(c, side, creator?.firstName ?? "them");
  const slot = c.source === "campaign";

  return (
    <article data-tone="paper" className="y-block y-hoverable y-ocard">
      <div className="y-ocard-thumb" aria-hidden>
        {adCopy || !cover ? (
          <span className="y-ocard-doc">
            <FileText size={22} strokeWidth={1.75} />
          </span>
        ) : (
          <VideoThumb video={cover} frame="9:16" showHook={false} showMeta={false} showViews={false} decorative />
        )}
      </div>
      <div className="min-w-0">
        <div className="y-ocard-top">
          {slot ? <SlotBadge commission={c} side={side} /> : <CommissionBadge status={c.status} side={side} />}
          {comments ? (
            <span
              className="y-cbadge y-num"
              data-unread={unread ? "true" : undefined}
              title={`${comments} ${comments === 1 ? "comment" : "comments"}${unread ? ", new ones unread" : ""}`}
            >
              <MessageCircle size={15} strokeWidth={2} aria-hidden />
              {comments}
              <span className="sr-only">{comments === 1 ? " comment" : " comments"}{unread ? ", unread" : ""}</span>
            </span>
          ) : null}
        </div>
        <h3 className="y-ocard-t">
          <Link href={paths.commission(c.id)} className="y-ocard-link" title={c.title}>
            {c.title}
          </Link>
        </h3>
        <div className="y-ocard-who">
          {side === "business" && creator ? (
            <FaceAvatar id={creator.id} name="" size={22} />
          ) : business ? (
            <BusinessLogo business={business} size={22} />
          ) : null}
          <span className="truncate">
            {side === "business" ? creator?.name : business?.name}
            {slot ? " · UGC campaign" : ""}
          </span>
        </div>
        <div className="y-ocard-meta">
          <span className="y-ocard-due y-num" data-look={due.look}>
            <Clock size={14} strokeWidth={2} aria-hidden className="flex-none" />
            {due.text}
          </span>
          {side === "business" ? (
            <span className="y-ocard-price y-num">{money(totals.total)}</span>
          ) : (
            <span className="y-ocard-price y-num">
              <small>you earn </small>
              {moneyExact(totals.creatorEarns)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
