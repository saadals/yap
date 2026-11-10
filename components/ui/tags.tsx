import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  Clock,
  Users,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge, type BadgeTone } from "./badge";

/**
 * Small 26px tag on cards. `neutral` for format, platform and "New"; `green` for the order type;
 * `dark` for a job type that isn't a video (Ad copy writing). Not interactive.
 */
export function Tag({
  tone = "neutral",
  icon,
  children,
  className = "",
}: {
  tone?: "neutral" | "green" | "dark";
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`y-tag ${className}`} data-look={tone}>
      {icon}
      {children}
    </span>
  );
}

/** "UGC campaign" or "Custom order" (round 3 answers, item 18), in the green type tag. */
export function TypeTag({
  kind,
  className = "",
}: {
  kind: "campaign" | "order";
  className?: string;
}) {
  return (
    <Tag tone="green" className={className}>
      {kind === "campaign" ? "UGC campaign" : "Custom order"}
    </Tag>
  );
}

/** Follower tier a creator needs to pick a campaign slot, e.g. "10K–20K". A people icon, no emoji. */
export function TierTag({ tier, className = "" }: { tier: string; className?: string }) {
  return (
    <Tag icon={<Users size={13} strokeWidth={2} aria-hidden />} className={className}>
      <span className="sr-only">Follower tier </span>
      {tier}
    </Tag>
  );
}

/**
 * Change against a previous period: "↗ 18%". Green when the change is good, red when it isn't;
 * `good` defaults to "up is good" (pass `good` for figures where down is better, like CAC).
 * `good={null}` is a figure with no better direction (a brand's spend): grey, same arrow.
 * On a green block it turns black on a dark tint.
 */
export function DeltaChip({
  direction,
  good,
  children,
  className = "",
}: {
  direction: "up" | "down";
  /** undefined: up is good; null: neither direction is better (neutral look). */
  good?: boolean | null;
  children: ReactNode;
  className?: string;
}) {
  const look = good === null ? "neutral" : (good ?? direction === "up") ? "true" : "false";
  const Icon = direction === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`y-delta ${className}`} data-good={look}>
      <Icon size={13} strokeWidth={2.25} aria-hidden />
      <span className="sr-only">{direction === "up" ? "Up " : "Down "}</span>
      {children}
    </span>
  );
}

/** Dashed "Sample" chip: every sample figure carries it, on every screen size (answers, item 44). */
export function SampleChip({
  children = "Sample",
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <span className={`y-sample ${className}`}>{children}</span>;
}

export type StatusLook = "waiting" | "moving" | "done" | "attention" | "negative";

const statusTone: Record<StatusLook, BadgeTone> = {
  waiting: "neutral",
  moving: "active",
  done: "success",
  attention: "warning",
  negative: "danger",
};

const statusIcon: Record<StatusLook, ReactNode> = {
  waiting: <Clock size={14} aria-hidden />,
  moving: <CircleDashed size={14} aria-hidden />,
  done: <CheckCircle2 size={14} aria-hidden />,
  attention: <AlertTriangle size={14} aria-hidden />,
  negative: <XCircle size={14} aria-hidden />,
};

/**
 * Status chip by meaning (Site-wide spec 5.4.3): waiting on someone, moving, done, needs
 * attention (the side that has to act), negative or closed. Icon + label, always; pass `icon` to
 * use a more specific one. The domain badges (`CommissionBadge`, `SlotBadge`…) already map
 * statuses to these looks; use this for anything they don't cover.
 */
export function StatusChip({
  look,
  icon,
  children,
  className = "",
}: {
  look: StatusLook;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge tone={statusTone[look]} icon={icon ?? statusIcon[look]} className={className}>
      {children}
    </Badge>
  );
}
