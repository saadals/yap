"use client";

import {
  AlertTriangle,
  Ban,
  BadgeCheck,
  CheckCircle2,
  Clapperboard,
  CircleDashed,
  Clock,
  Eye,
  FileClock,
  Gift,
  Loader2,
  Megaphone,
  LifeBuoy,
  Repeat2,
  Send,
  Star,
  Undo2,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { commissionStatus, pitchStatus, requestStatus, type Tone } from "@/lib/taxonomy";
import type { Commission, CommissionStatus, PitchStatus, RequestStatus, Role } from "@/lib/types";

const s = 14;

const commissionIcons: Record<CommissionStatus, React.ReactNode> = {
  offered: <Gift size={s} aria-hidden />,
  in_progress: <CircleDashed size={s} aria-hidden />,
  delivered: <Eye size={s} aria-hidden />,
  revision: <Repeat2 size={s} aria-hidden />,
  completed: <CheckCircle2 size={s} aria-hidden />,
  declined: <XCircle size={s} aria-hidden />,
  cancelled: <Ban size={s} aria-hidden />,
  disputed: <LifeBuoy size={s} aria-hidden />,
};

const requestIcons: Record<RequestStatus, React.ReactNode> = {
  draft: <FileClock size={s} aria-hidden />,
  open: <span aria-hidden className="size-2 rounded-full bg-current" />,
  hired: <CheckCircle2 size={s} aria-hidden />,
  closed: <Ban size={s} aria-hidden />,
};

const pitchIcons: Record<PitchStatus, React.ReactNode> = {
  sent: <Send size={s} aria-hidden className="y-flip" />,
  viewed: <Eye size={s} aria-hidden />,
  shortlisted: <Star size={s} aria-hidden />,
  declined: <XCircle size={s} aria-hidden />,
  hired: <CheckCircle2 size={s} aria-hidden />,
  withdrawn: <Undo2 size={s} aria-hidden />,
};

/**
 * Status is never colour alone: icon + label, semantic tone. Pass `side` (the viewer's side of the
 * deal) where it changes the wording: an offer is "Offer sent" to the business, "New offer" to the
 * creator.
 */
export function CommissionBadge({
  status,
  side,
  className,
}: {
  status: CommissionStatus;
  side?: Role;
  className?: string;
}) {
  const info = commissionStatus[status];
  const label = status === "offered" && side === "creator" ? "New offer" : info.label;
  return (
    <Badge tone={info.tone} icon={commissionIcons[status]} className={className}>
      {label}
    </Badge>
  );
}

/**
 * A campaign slot's status (one creator's video on a UGC campaign): Filming → Review copy ready →
 * Approved, post due → Posted. Also how a slot ended (removed, not approved).
 */
export function slotStatus(c: Pick<Commission, "status" | "post" | "cancelCode">): {
  label: string;
  tone: Tone;
  icon: React.ReactNode;
} {
  switch (c.status) {
    case "in_progress":
      return { label: "Filming", tone: "neutral", icon: <Clapperboard size={s} aria-hidden /> };
    case "delivered":
      return { label: "Review copy ready", tone: "warning", icon: <Eye size={s} aria-hidden /> };
    case "revision":
      return { label: "Changes requested", tone: "warning", icon: <Repeat2 size={s} aria-hidden /> };
    case "completed":
      if (c.post?.status === "live") return { label: "Posted", tone: "success", icon: <BadgeCheck size={s} aria-hidden /> };
      if (c.post?.status === "checking") return { label: "Checking post", tone: "info", icon: <Loader2 size={s} aria-hidden /> };
      if (c.post?.status === "removed") return { label: "Post taken down", tone: "danger", icon: <AlertTriangle size={s} aria-hidden /> };
      return { label: "Approved, post due", tone: "info", icon: <Megaphone size={s} aria-hidden /> };
    case "cancelled":
      if (c.cancelCode === "video_rejected") return { label: "Not approved", tone: "neutral", icon: <XCircle size={s} aria-hidden /> };
      if (c.cancelCode === "campaign_closed") return { label: "Campaign closed", tone: "neutral", icon: <Ban size={s} aria-hidden /> };
      return { label: "Removed", tone: "neutral", icon: <Ban size={s} aria-hidden /> };
    case "disputed":
      return { label: commissionStatus.disputed.label, tone: "danger", icon: <LifeBuoy size={s} aria-hidden /> };
    default:
      return { label: commissionStatus[c.status].label, tone: commissionStatus[c.status].tone, icon: commissionIcons[c.status] };
  }
}

export function SlotBadge({
  commission,
  className,
}: {
  commission: Pick<Commission, "status" | "post" | "cancelCode">;
  className?: string;
}) {
  const info = slotStatus(commission);
  return (
    <Badge tone={info.tone} icon={info.icon} className={className}>
      {info.label}
    </Badge>
  );
}

export function RequestBadge({
  status,
  campaign = false,
  className,
}: {
  status: RequestStatus;
  /** Campaign wording: "Taking creators" / "Full" instead of "Open for pitches" / "Hired". */
  campaign?: boolean;
  className?: string;
}) {
  const base = requestStatus[status];
  const info = campaign
    ? status === "open"
      ? { label: "Taking creators", tone: base.tone }
      : status === "hired"
        ? { label: "Full", tone: base.tone }
        : base
    : base;
  return (
    <Badge tone={info.tone} icon={requestIcons[status]} className={className}>
      {info.label}
    </Badge>
  );
}

export function PitchBadge({ status, className }: { status: PitchStatus; className?: string }) {
  const info = pitchStatus[status];
  return (
    <Badge tone={info.tone} icon={pitchIcons[status]} className={className}>
      {info.label}
    </Badge>
  );
}

/** Deadline badge with urgency. */
export function DueBadge({
  text,
  urgency,
  className,
}: {
  text: string;
  urgency: "late" | "soon" | "ok";
  className?: string;
}) {
  return (
    <Badge
      tone={urgency === "late" ? "danger" : urgency === "soon" ? "warning" : "neutral"}
      icon={urgency === "late" ? <AlertTriangle size={s} aria-hidden /> : <Clock size={s} aria-hidden />}
      className={className}
    >
      {text}
    </Badge>
  );
}
