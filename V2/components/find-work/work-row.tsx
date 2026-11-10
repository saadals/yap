"use client";

import {
  AlertCircle,
  CheckCircle2,
  CircleCheck,
  Clapperboard,
  Eye,
  EyeOff,
  MailOpen,
  Minus,
  Repeat2,
  Send,
  Sparkles,
  Star,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { Badge } from "@/components/ui/badge";
import { paths } from "@/lib/paths";

import { slotsLine } from "@/components/opportunity/campaign-copy";

import { deadlineLabel, fitLine, metaLine, myState, payLabel, type WorkItem } from "./work-items";

import "@/app/styles/studio-work.css";

/** Status is never colour alone: the icon for your state on an item. */
function stateIcon(item: WorkItem): React.ReactNode {
  const props = { size: 13, "aria-hidden": true } as const;
  if (item.slot) {
    if (item.slot.status === "revision") return <Repeat2 {...props} />;
    if (item.slot.status === "delivered") return <Eye {...props} />;
    if (item.slot.status === "in_progress") return <Clapperboard {...props} />;
    return <CheckCircle2 {...props} />;
  }
  switch (item.pitch?.status) {
    case "sent":
      return <Send {...props} className="y-flip" />;
    case "viewed":
      return <Eye {...props} />;
    case "shortlisted":
      return <Star {...props} />;
    case "declined":
      return <XCircle {...props} />;
    case "hired":
      return <CheckCircle2 {...props} />;
    default:
      return null;
  }
}

/**
 * One open brief or campaign: logo, title (the link), one meta line, then pay, the deadline, the
 * fit (or campaign eligibility) and your own state. "Not interested" sits above the stretched link.
 */
export function WorkRow({
  item,
  onHide,
  onUnhide,
  compact = false,
}: {
  item: WorkItem;
  onHide?: (item: WorkItem) => void;
  onUnhide?: (item: WorkItem) => void;
  /** Studio Today: no hide button, no meta line. */
  compact?: boolean;
}) {
  const state = myState(item);
  const fit = fitLine(item);
  const canHide = !compact && !item.pitch && !item.slot;
  const elig = item.eligibilityText;
  const brand = item.business?.name ?? "A brand";

  return (
    <div role="listitem" className="sw-workrow" data-hidden={item.hidden || undefined}>
      {item.business ? <BusinessLogo business={item.business} size={compact ? 36 : 40} className="mt-0.5" /> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <Link href={paths.order(item.id)} className="sw-stretch font-semibold leading-snug">
            {item.request.title}
          </Link>
          <span className="y-num hidden flex-none text-end font-semibold sm:block">{payLabel(item)}</span>
        </div>
        {compact ? null : <p className="y-small y-fg-2 truncate">{`${brand} · ${metaLine(item)}`}</p>}
        <div className="y-small flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
          <span className="y-num font-semibold sm:hidden">{payLabel(item)}</span>
          <span className="y-fg-2">{compact ? `${brand} · ${deadlineLabel(item)}` : deadlineLabel(item)}</span>
          {item.kind === "campaign" && elig && !item.slot ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              {elig.state === "ok" ? (
                <CircleCheck size={15} aria-hidden className="flex-none text-(--y-success)" />
              ) : elig.state === "fix" ? (
                <AlertCircle size={15} aria-hidden className="flex-none" />
              ) : (
                <Minus size={15} aria-hidden className="flex-none" />
              )}
              <span className={elig.state === "no" ? "y-fg-2" : ""}>
                {elig.text}
                {elig.state === "ok" && item.openSlots !== undefined ? ` · ${slotsLine(item.openSlots, item.request.slots).toLowerCase()}` : ""}
              </span>
            </span>
          ) : null}
          {item.kind === "custom" && fit && !state ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Sparkles size={15} aria-hidden className="flex-none" />
              {fit}
            </span>
          ) : null}
          {item.invited && !item.pitch ? (
            <Badge tone="ink" icon={<MailOpen size={13} aria-hidden />}>
              Invited
            </Badge>
          ) : null}
          {state ? (
            <Badge tone={state.tone} icon={stateIcon(item)}>
              {state.label}
            </Badge>
          ) : null}
        </div>
      </div>
      {canHide ? (
        <div className="sw-above -me-2 flex-none self-start">
          {item.hidden ? (
            <button
              type="button"
              className="y-round"
              data-tone-btn="ghost"
              data-size="sm"
              aria-label={`Show “${item.request.title}” again`}
              title="Show again"
              onClick={() => onUnhide?.(item)}
            >
              <Eye size={17} aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              className="y-round"
              data-tone-btn="ghost"
              data-size="sm"
              aria-label={`Not interested in “${item.request.title}”`}
              title="Not interested"
              onClick={() => onHide?.(item)}
            >
              <EyeOff size={17} aria-hidden />
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Rows in one white card (the Find work list, Today's rail). */
export function WorkList({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div data-tone="paper" className="y-block overflow-hidden" role="list" aria-label={label}>
      {children}
    </div>
  );
}
