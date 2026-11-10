"use client";

import { Eye, FilePen, Megaphone, MessageSquareText } from "lucide-react";

import { CommissionBadge, RequestBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { ProgressBar } from "@/components/ui/progress";
import { autoApproveAt } from "@/lib/attention";
import { dueLabel, money, plural, shortDate, timeAgoInline, weekdayDate } from "@/lib/format";
import { closesInDays, isAdCopy, isCampaign } from "@/lib/selectors";
import { formatById, jobTypeById, tierById } from "@/lib/taxonomy";
import type { ContentRequest } from "@/lib/types";

import { type OrderItem, itemHref } from "./order-items";
import { RowLink } from "./row-link";

/** A square icon tile in a row's lead slot (requests, campaigns, drafts). */
export function IconTile({ children, size = 40 }: { children: React.ReactNode; size?: number }) {
  return (
    <span
      aria-hidden
      className="grid flex-none place-items-center rounded-(--y-r-sm) bg-(--b-chip) text-(--b-fg)"
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  );
}

function Lead({ item }: { item: OrderItem }) {
  if (item.kind === "job")
    return <FaceAvatar id={item.commission.creatorId} name={item.creator?.name ?? ""} size={40} />;
  if (item.kind === "campaign")
    return (
      <IconTile>
        <Megaphone size={18} />
      </IconTile>
    );
  if (item.kind === "draft")
    return (
      <IconTile>
        <FilePen size={18} />
      </IconTile>
    );
  const Icon = formatById[item.request.brief.format]?.icon ?? MessageSquareText;
  return (
    <IconTile>
      <Icon size={18} />
    </IconTile>
  );
}

/** "Closes Nov 18", or "Closes tomorrow" when it's close: when a custom order stops taking pitches. */
export function closesLine(request: Pick<ContentRequest, "closesAt">): string {
  const days = closesInDays(request);
  if (days < 0) return `Closing date was ${shortDate(request.closesAt)}`;
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days <= 3) return `Closes in ${days} days`;
  return `Closes ${shortDate(request.closesAt)}`;
}

/** The row's one meta line (never what the row's chip already says). */
export function itemMeta(item: OrderItem): string {
  switch (item.kind) {
    case "job": {
      const c = item.commission;
      const who = item.creator?.name ?? "Creator";
      const first = item.creator?.firstName ?? "the creator";
      // Ad copy has no video format: its job type labels it on every status ("Ad copy writing").
      const kind = isAdCopy(c) ? jobTypeById["ad-copy"].name : null;
      const format = kind ?? formatById[c.brief.format]?.name;
      const line = (...parts: (string | null | undefined)[]) => [who, ...parts].filter(Boolean).join(" · ");
      switch (c.status) {
        case "offered":
          return line(kind, `Waiting for ${first} to accept`);
        case "in_progress":
          return line(format, dueLabel(c.dueDate).text);
        case "delivered":
          return line(kind, `Approves itself ${weekdayDate(autoApproveAt(c))}`);
        case "revision":
          return line(kind, "Making your changes", dueLabel(c.dueDate).text);
        case "disputed":
          return line(kind, "Our team is helping resolve this");
        case "completed":
          return line(format, `Approved ${shortDate(c.completedAt ?? c.createdAt)}`);
        case "declined":
          return line("Declined the offer, nothing was charged");
        case "cancelled":
          return line(kind, "Cancelled and refunded");
      }
      return who;
    }
    case "campaign": {
      const terms = item.request.campaign;
      const tier = terms ? tierById[terms.tierId] : undefined;
      return [
        "UGC campaign",
        terms ? `${money(terms.pricePerVideo)} a Yapp` : null,
        tier ? `${tier.label} followers` : null,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    case "request": {
      const kind = isAdCopy(item.request) ? `${jobTypeById["ad-copy"].name} · ` : "";
      if (item.stage === "done") return `${kind}${item.pitches ? `Closed · ${plural(item.pitches, "pitch", "pitches")}` : "Closed"}`;
      // New pitches are the row's chip (or a Needs you row on Home), so the meta doesn't repeat them.
      const pitches = item.pitches ? plural(item.pitches, "pitch", "pitches") : "No pitches yet";
      return `${kind}${pitches} · ${closesLine(item.request)}`;
    }
    case "draft":
      return [
        (item.autosave?.kind ?? (isCampaign(item.request) ? "campaign" : "custom")) === "campaign" ? "UGC campaign" : "Custom order",
        "Not posted yet",
        `Saved ${timeAgoInline(item.request?.postedAt ?? item.autosave!.savedAt)}`,
      ].join(" · ");
  }
}

/** The status chip at the end of a row. What needs you gets the warning look and says what. */
export function ItemChip({ item, quiet = false }: { item: OrderItem; quiet?: boolean }) {
  switch (item.kind) {
    case "job":
      return <CommissionBadge status={item.commission.status} side="business" />;
    case "campaign":
      if (!quiet && item.needsYou)
        return (
          <Badge tone="warning" icon={<Eye size={14} aria-hidden />}>
            {item.progress.review} to review
          </Badge>
        );
      return <RequestBadge status={item.request.status} campaign />;
    case "request":
      if (!quiet && item.unread)
        return (
          <Badge tone="warning" icon={<MessageSquareText size={14} aria-hidden />}>
            {plural(item.unread, "new pitch", "new pitches")}
          </Badge>
        );
      return <RequestBadge status={item.request.status} />;
    case "draft":
      return <RequestBadge status="draft" />;
  }
}

/** Campaign progress under the meta line: a thin bar and "3 of 10 approved". */
function CampaignProgress({ item }: { item: Extract<OrderItem, { kind: "campaign" }> }) {
  const { approved, total, taken } = item.progress;
  const label = `${approved} of ${plural(total, "video")} approved`;
  return (
    <span className="flex items-center gap-3">
      <ProgressBar value={approved / Math.max(1, total)} label={label} done={approved >= total} className="max-w-[220px] flex-1" />
      <span className="y-micro y-fg-2 y-num whitespace-nowrap">
        {approved} of {total} approved{taken > approved ? ` · ${taken - approved} in work` : ""}
      </span>
    </span>
  );
}

/**
 * One order as a row: lead (creator face or an icon tile), title, one meta line, a status chip.
 * Campaigns add a progress bar. `quiet` (Home) leaves out what a Needs you row already says.
 */
export function OrderRow({ item, quiet = false }: { item: OrderItem; quiet?: boolean }) {
  const chip = <ItemChip item={item} quiet={quiet} />;
  return (
    <RowLink
      href={itemHref(item)}
      lead={<Lead item={item} />}
      title={item.title}
      meta={itemMeta(item)}
      below={item.kind === "campaign" && item.stage === "progress" ? <CampaignProgress item={item} /> : undefined}
      end={chip}
      phoneEnd={chip}
    />
  );
}
