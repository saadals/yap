"use client";

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  Eye,
  FileClock,
  Gift,
  LifeBuoy,
  Repeat2,
  Send,
  Star,
  Undo2,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { usePrefs } from "@/lib/prefs";
import { commissionStatus, pitchStatus, requestStatus } from "@/lib/taxonomy";
import type { CommissionStatus, PitchStatus, RequestStatus } from "@/lib/types";

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

/** Status is never colour alone: icon + label, semantic tone. */
export function CommissionBadge({ status, className }: { status: CommissionStatus; className?: string }) {
  const { role } = usePrefs();
  const info = commissionStatus[status];
  // The viewing side matters for offers: the business sent it, the creator received it.
  const label = status === "offered" && role === "creator" ? "New offer" : info.label;
  return (
    <Badge tone={info.tone} icon={commissionIcons[status]} className={className}>
      {label}
    </Badge>
  );
}

export function RequestBadge({ status, className }: { status: RequestStatus; className?: string }) {
  const info = requestStatus[status];
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
