"use client";

import { CheckCircle2, FilePen, Megaphone, MessageSquareText, MessagesSquare, Star } from "lucide-react";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { VideoThumb } from "@/components/domain/video-thumb";
import { Block } from "@/components/ui/block";
import { type AttentionItem } from "@/lib/attention";
import { businessById, commissionById, isAdCopy, latestDelivery } from "@/lib/selectors";
import { type DemoState, useDemo } from "@/lib/store";
import { formatById, jobTypeById } from "@/lib/taxonomy";

import { IconTile } from "./order-row";
import { RowLink } from "./row-link";

const SHOWN = 4;

/**
 * The row's lead shows the thing waiting, not the person (the creator's name is already in the
 * title, and two rows about one creator would otherwise look the same): the delivered video as a
 * small thumbnail, or an icon tile for ad copy, pitches, a shortlist, campaign review copies and
 * drafts.
 */
function Lead({ s, item }: { s: DemoState; item: AttentionItem }) {
  const icon = (Icon: React.ComponentType<{ size?: number }>) => (
    <IconTile>
      <Icon size={18} />
    </IconTile>
  );
  switch (item.kind) {
    case "review-copies":
      return icon(Megaphone);
    case "pitches":
      return icon(MessagesSquare);
    case "shortlist":
      return icon(Star);
    case "draft":
      return icon(FilePen);
  }
  const commission = item.commissionId ? commissionById(s, item.commissionId) : undefined;
  if (commission) {
    if (isAdCopy(commission)) return icon(jobTypeById["ad-copy"].icon);
    const video = latestDelivery(commission)?.video;
    // A vertical frame (a square one draws the wide scene), trimmed to 40×44 so the row keeps the
    // height of its neighbours.
    if (video)
      return (
        <span aria-hidden className="grid h-11 w-10 flex-none place-items-center overflow-hidden rounded-(--y-r-sm)">
          <VideoThumb video={video} frame="4:5" showHook={false} showMeta={false} decorative rounded={false} />
        </span>
      );
    return icon(formatById[commission.brief.format]?.icon ?? MessageSquareText);
  }
  const business = item.businessId ? businessById(s, item.businessId) : undefined;
  return business ? <BusinessLogo business={business} size={40} /> : icon(MessageSquareText);
}

/** The action as a pill-shaped label (the whole row is the link, so this is not a second control). */
function ActionPill({ label, primary }: { label: string; primary: boolean }) {
  return (
    <span aria-hidden className="y-pill pointer-events-none" data-variant={primary ? "neon" : "soft"} data-size="sm">
      {label}
    </span>
  );
}

/**
 * Needs you: every action waiting on the ordering side (lib/attention.ts), most urgent first. The
 * first row's action is the screen's one green; the rest are soft. On phones only the first row
 * shows its action (under the text); the others are plain rows. Four rows, then "Show n more".
 */
export function NeedsYou({ items }: { items: AttentionItem[] }) {
  const s = useDemo();
  const [expanded, setExpanded] = useState(false);

  if (!items.length) {
    return (
      <Block tone="paper" pad="md" className="flex items-start gap-3">
        <CheckCircle2 size={22} aria-hidden className="mt-0.5 flex-none text-(--y-success)" />
        <div className="flex flex-col gap-0.5">
          <p className="y-head">You&apos;re all caught up</p>
          <p className="y-small y-fg-2">
            Nothing is waiting on you. Deliveries to review and new pitches land here first.
          </p>
        </div>
      </Block>
    );
  }

  const shown = expanded ? items : items.slice(0, SHOWN);
  const more = items.length - SHOWN;
  return (
    <Block tone="paper" pad="none" className="overflow-hidden">
      <div role="list" aria-label="Needs you" className="y-list">
        {shown.map((item, index) => {
          const primary = index === 0;
          const pill = <ActionPill label={item.action} primary={primary} />;
          return (
            <RowLink
              key={`${item.kind}-${item.commissionId ?? item.requestId ?? index}`}
              href={item.href}
              lead={<Lead s={s} item={item} />}
              title={item.title}
              meta={item.line}
              wrap
              ariaLabel={`${item.title}. ${item.line} ${item.action}`}
              end={primary ? pill : <span className="max-sm:hidden">{pill}</span>}
              phoneEnd={primary ? pill : undefined}
              chevron={primary ? false : "phone"}
            />
          );
        })}
      </div>
      {more > 0 ? <ShowMore more={more} expanded={expanded} onToggle={() => setExpanded((v) => !v)} /> : null}
    </Block>
  );
}

/**
 * "Show 3 more" / "Show fewer" under a list, inside its card: the same words and look on both Home
 * pages (Studio Home imports it).
 */
export function ShowMore({ more, expanded, onToggle }: { more: number; expanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="y-row y-small !min-h-12 justify-center border-t border-(--b-line) font-medium"
    >
      {expanded ? "Show fewer" : `Show ${more} more`}
    </button>
  );
}
