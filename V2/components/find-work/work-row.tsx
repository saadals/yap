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
  Type,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { Badge } from "@/components/ui/badge";
import { PillButton } from "@/components/ui/pill-button";
import { paths } from "@/lib/paths";
import { jobTypeById } from "@/lib/taxonomy";

import { pickLabel, slotsLine } from "@/components/opportunity/campaign-copy";

import { brandRecord, closingLabel, fitLine, metaLine, myState, netLabel, payLabel, type WorkItem } from "./work-items";

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
 * One open custom order or UGC campaign: logo, title (the link), one meta line, then the listed
 * price with your net, the closing date, the fit (or campaign eligibility in words) and your own
 * state. A campaign you qualify for carries "Pick now · 3 of 10 left" (green: the one action Find
 * work repeats per campaign; it opens the pick sheet via `onPick`). "Not interested" and Pick now
 * sit above the stretched link.
 */
export function WorkRow({
  item,
  onHide,
  onUnhide,
  onPick,
  compact = false,
}: {
  item: WorkItem;
  onHide?: (item: WorkItem) => void;
  onUnhide?: (item: WorkItem) => void;
  /** Campaign rows you qualify for: open the pick sheet. Without it the row only links. */
  onPick?: (item: WorkItem) => void;
  /** Studio Today: no hide button, no meta line, no green (the count is plain text). */
  compact?: boolean;
}) {
  const state = myState(item);
  const fit = fitLine(item);
  const canHide = !compact && !item.pitch && !item.slot;
  const elig = item.eligibilityText;
  const brand = item.business?.name ?? "A brand";
  const record = brandRecord(item.business);
  const canPick = item.kind === "campaign" && !item.slot && Boolean(item.eligibility?.ok) && (item.openSlots ?? 0) > 0;
  const total = item.request.slots;
  const meta = [brand, metaLine(item), record].filter(Boolean).join(" · ");

  const pickButton = (className: string) =>
    canPick && onPick && !compact ? (
      <PillButton
        variant="neon"
        size="sm"
        className={`sw-above ${className}`}
        aria-label={`${pickLabel(item.openSlots ?? 0, total)}: ${item.request.title}`}
        onClick={() => onPick(item)}
      >
        {pickLabel(item.openSlots ?? 0, total)}
      </PillButton>
    ) : null;

  return (
    <div role="listitem" className="sw-workrow" data-hidden={item.hidden || undefined}>
      {item.business ? <BusinessLogo business={item.business} size={compact ? 36 : 40} className="mt-0.5" /> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link href={paths.order(item.id)} className="sw-stretch font-semibold leading-snug">
          {item.request.title}
        </Link>
        {compact ? null : <p className="y-small y-fg-2 truncate">{meta}</p>}
        <div className="y-small flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
          <span className="y-num sm:hidden">
            <span className="font-semibold">{payLabel(item)}</span>
            <span className="y-fg-2"> · {netLabel(item)}</span>
          </span>
          <span className="y-fg-2">{compact ? `${brand} · ${closingLabel(item)}` : closingLabel(item)}</span>
          {item.jobType === "ad-copy" && compact ? (
            <span className="inline-flex items-center gap-1.5">
              <Type size={15} aria-hidden className="flex-none" />
              {jobTypeById["ad-copy"].name}
            </span>
          ) : null}
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
                {elig.state === "ok" && compact && item.openSlots !== undefined
                  ? ` · ${slotsLine(item.openSlots, total).toLowerCase()}`
                  : ""}
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
        {pickButton("mt-1.5 w-full sm:hidden")}
      </div>
      <div className="hidden flex-none flex-col items-end gap-0.5 text-end sm:flex">
        <span className="y-num font-semibold">{payLabel(item)}</span>
        <span className="y-micro y-num y-fg-2">{netLabel(item)}</span>
        {pickButton("mt-2")}
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
      ) : compact ? null : (
        // Same width as the hide button, so prices line up down the list.
        <div className="-me-2 hidden flex-none sm:block" aria-hidden>
          <span className="y-round invisible" data-size="sm" />
        </div>
      )}
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
