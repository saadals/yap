"use client";

import {
  AlertTriangle,
  Ban,
  BadgeCheck,
  CheckCircle2,
  CircleDashed,
  Clapperboard,
  Eye,
  Gift,
  Hourglass,
  LifeBuoy,
  Loader2,
  Megaphone,
  Repeat2,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { autoApproveAt } from "@/lib/attention";
import { dueLabel, money, shortDate, weekdayDate } from "@/lib/format";
import { businessById, commissionTotals, isActive, reviewById } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { CAMPAIGN_RESTORE_HOURS, formatById, type Tone } from "@/lib/taxonomy";
import type { Commission } from "@/lib/types";

/**
 * A job (commission) from the maker's side, for Studio lists: which group it sits in, its chip and
 * its one meta line. The chips use the five looks: the side that has to act sees "warning".
 */

const i = 14;

type Chip = { label: string; tone: Tone; icon: React.ReactNode };

const isSlot = (c: Commission) => c.source === "campaign";

/** Something is waiting on the creator: an offer, requested changes, a campaign post. */
export function needsYou(c: Commission): boolean {
  if (c.status === "offered" || c.status === "revision") return true;
  return isSlot(c) && c.status === "completed" && (c.post?.status === "due" || c.post?.status === "removed");
}

/** Still moving: everything `isActive`, plus a campaign post being checked. */
export const isOpenJob = (c: Commission) =>
  isActive(c) || (isSlot(c) && c.status === "completed" && c.post?.status === "checking");

/** Most urgent first: offers, then changes, then posts; earliest date first within each. */
export function needsYouOrder(a: Commission, b: Commission) {
  const rank = (c: Commission) => (c.status === "offered" ? 0 : c.status === "revision" ? 1 : 2);
  return rank(a) - rank(b) || Date.parse(a.dueDate) - Date.parse(b.dueDate);
}

/** In progress: soonest due first; work waiting on the brand after work you're making. */
export function inProgressOrder(a: Commission, b: Commission) {
  const rank = (c: Commission) => (c.status === "in_progress" ? 0 : c.status === "disputed" ? 1 : 2);
  return rank(a) - rank(b) || Date.parse(a.dueDate) - Date.parse(b.dueDate);
}

/** What the creator earns on this job (they keep 100% of price and add-ons). */
export const earns = (c: Commission) => (isSlot(c) ? c.price : commissionTotals(c).creatorEarns);

export function jobChip(c: Commission): Chip {
  if (isSlot(c)) {
    switch (c.status) {
      case "in_progress":
        return { label: "Filming", tone: "active", icon: <Clapperboard size={i} aria-hidden /> };
      case "delivered":
        return { label: "In review", tone: "neutral", icon: <Eye size={i} aria-hidden /> };
      case "revision":
        return { label: "Changes requested", tone: "warning", icon: <Repeat2 size={i} aria-hidden /> };
      case "completed":
        if (c.post?.status === "due") return { label: "Post due", tone: "warning", icon: <Megaphone size={i} aria-hidden /> };
        if (c.post?.status === "removed")
          return { label: "Post taken down", tone: "danger", icon: <AlertTriangle size={i} aria-hidden /> };
        if (c.post?.status === "checking") return { label: "Checking post", tone: "neutral", icon: <Loader2 size={i} aria-hidden /> };
        if (c.payment.status === "pending") return { label: "Pay pending", tone: "neutral", icon: <Hourglass size={i} aria-hidden /> };
        return { label: "Paid", tone: "success", icon: <CheckCircle2 size={i} aria-hidden /> };
      case "cancelled":
        if (c.cancelCode === "video_rejected") return { label: "Not approved", tone: "danger", icon: <XCircle size={i} aria-hidden /> };
        if (c.cancelCode === "campaign_closed") return { label: "Campaign closed", tone: "danger", icon: <Ban size={i} aria-hidden /> };
        if (c.cancelCode === "post_removed") return { label: "Post stayed down", tone: "danger", icon: <AlertTriangle size={i} aria-hidden /> };
        return { label: "Removed", tone: "danger", icon: <Ban size={i} aria-hidden /> };
      case "disputed":
        return { label: "In resolution", tone: "danger", icon: <LifeBuoy size={i} aria-hidden /> };
      default:
        return { label: "Slot ended", tone: "danger", icon: <Ban size={i} aria-hidden /> };
    }
  }
  switch (c.status) {
    case "offered":
      return { label: "New offer", tone: "warning", icon: <Gift size={i} aria-hidden /> };
    case "in_progress":
      return { label: "In production", tone: "active", icon: <CircleDashed size={i} aria-hidden /> };
    case "delivered":
      return { label: "In review", tone: "neutral", icon: <Eye size={i} aria-hidden /> };
    case "revision":
      return { label: "Changes requested", tone: "warning", icon: <Repeat2 size={i} aria-hidden /> };
    case "completed":
      return c.payment.status === "released"
        ? { label: "Paid", tone: "success", icon: <CheckCircle2 size={i} aria-hidden /> }
        : { label: "Approved", tone: "success", icon: <BadgeCheck size={i} aria-hidden /> };
    case "declined":
      return { label: "Declined", tone: "danger", icon: <XCircle size={i} aria-hidden /> };
    case "cancelled":
      return { label: "Cancelled", tone: "danger", icon: <Ban size={i} aria-hidden /> };
    case "disputed":
      return { label: "In resolution", tone: "danger", icon: <LifeBuoy size={i} aria-hidden /> };
  }
}

export function JobChip({ commission }: { commission: Commission }) {
  const chip = jobChip(commission);
  return (
    <Badge tone={chip.tone} icon={chip.icon}>
      {chip.label}
    </Badge>
  );
}

/** The brand's star rating on a finished job: the review, or a campaign's quick rating. */
export function ratingFor(s: DemoState, c: Commission): number | undefined {
  if (c.reviewId) return reviewById(s, c.reviewId)?.rating;
  return c.quickRating;
}

/** The second half of the meta line: when, or what happens next. */
function when(c: Commission): string {
  if (isSlot(c)) {
    switch (c.status) {
      case "in_progress":
        return c.deliveries.length ? `Upload again by ${weekdayDate(c.dueDate)}` : `Upload your review copy by ${weekdayDate(c.dueDate)}`;
      case "delivered":
        return `Approves itself ${weekdayDate(autoApproveAt(c))}`;
      case "revision":
        return "Make the changes and upload again";
      case "completed":
        if (c.post?.status === "due") return "Post it to start the 7 days to payment";
        if (c.post?.status === "removed") return `Put it back up within ${CAMPAIGN_RESTORE_HOURS} hours`;
        if (c.post?.status === "checking") return "Checking your post";
        if (c.payment.status === "pending")
          return c.withdrawableFrom ? `Released ${shortDate(c.withdrawableFrom)} if the post stays up` : "Waiting for the post check";
        return `Finished ${shortDate(c.withdrawableFrom ?? c.completedAt ?? c.createdAt)}`;
      case "cancelled":
        return "Slot ended";
      default:
        return "Our team is helping";
    }
  }
  switch (c.status) {
    case "offered":
      return `Due ${shortDate(c.dueDate)} if you accept`;
    case "in_progress":
    case "revision":
      return dueLabel(c.dueDate).text;
    case "delivered":
      return `Approves itself ${weekdayDate(autoApproveAt(c))}`;
    case "completed":
      return `Finished ${shortDate(c.completedAt ?? c.createdAt)}`;
    case "declined":
      return "You declined this offer";
    case "cancelled":
      return c.completedAt ? `Cancelled ${shortDate(c.completedAt)}` : "Cancelled";
    case "disputed":
      return "Our team is helping";
  }
}

/** "Daftar · App demo · Due Thu, Nov 5" or "Brindle · UGC campaign · Upload your review copy by Fri". */
export function jobMeta(s: DemoState, c: Commission, options: { rating?: boolean } = {}): string {
  const brand = businessById(s, c.businessId)?.name;
  const kind = isSlot(c) ? "UGC campaign" : formatById[c.brief.format].name;
  const rating = options.rating ? ratingFor(s, c) : undefined;
  return [brand, kind, when(c), rating ? `Rated ${rating.toFixed(1)} ★` : null].filter(Boolean).join(" · ");
}

/** "$260", or nothing for work that ended without pay. */
export function jobAmount(c: Commission): string | undefined {
  if (c.status === "cancelled" || c.status === "declined") return undefined;
  return money(earns(c));
}
