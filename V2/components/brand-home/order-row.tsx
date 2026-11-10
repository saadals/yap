"use client";

import { Eye, FilePen, Megaphone, MessageSquareText } from "lucide-react";

import { CommissionBadge, RequestBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { ProgressBar } from "@/components/ui/progress";
import { autoApproveAt } from "@/lib/attention";
import { dueLabel, money, plural, shortDate, timeAgoInline, weekdayDate } from "@/lib/format";
import { formatById, tierById } from "@/lib/taxonomy";

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

/** The row's one meta line. `quiet` drops what a Needs you row above already says. */
export function itemMeta(item: OrderItem, quiet = false): string {
  switch (item.kind) {
    case "job": {
      const c = item.commission;
      const who = item.creator?.name ?? "Creator";
      const first = item.creator?.firstName ?? "the creator";
      const format = formatById[c.brief.format]?.name;
      switch (c.status) {
        case "offered":
          return `${who} · Waiting for ${first} to accept`;
        case "in_progress":
          return `${who} · ${format} · ${dueLabel(c.dueDate).text}`;
        case "delivered":
          return `${who} · Approves itself ${weekdayDate(autoApproveAt(c))}`;
        case "revision":
          return `${who} · Making your changes · ${dueLabel(c.dueDate).text}`;
        case "disputed":
          return `${who} · Our team is helping resolve this`;
        case "completed":
          return `${who} · ${format} · Approved ${shortDate(c.completedAt ?? c.createdAt)}`;
        case "declined":
          return `${who} · Declined the offer, nothing was charged`;
        case "cancelled":
          return `${who} · Cancelled and refunded`;
      }
      return who;
    }
    case "campaign": {
      const terms = item.request.campaign;
      const tier = terms ? tierById[terms.tierId] : undefined;
      return [
        "UGC campaign",
        tier ? `${tier.label} followers` : null,
        terms ? `${money(terms.pricePerVideo)} a video` : null,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    case "request": {
      if (item.stage === "done") return item.pitches ? `Closed · ${plural(item.pitches, "pitch", "pitches")}` : "Closed";
      const pitches = item.pitches ? plural(item.pitches, "pitch", "pitches") : "No pitches yet";
      const fresh = !quiet && item.unread ? ` · ${item.unread} new` : "";
      return `${pitches}${fresh} · Posted ${timeAgoInline(item.request.postedAt)}`;
    }
    case "draft":
      return `Not posted yet · Saved ${timeAgoInline(item.request?.postedAt ?? item.autosave!.savedAt)}`;
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
      meta={itemMeta(item, quiet)}
      below={item.kind === "campaign" && item.stage === "progress" ? <CampaignProgress item={item} /> : undefined}
      end={chip}
      phoneEnd={chip}
    />
  );
}
