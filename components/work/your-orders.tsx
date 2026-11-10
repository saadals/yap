"use client";

import { ChevronRight, FilePen, Megaphone } from "lucide-react";
import Link from "next/link";

import { Block } from "@/components/ui/block";
import { CardHead } from "@/components/ui/page";
import { NOW, HOUR } from "@/lib/clock";
import { daysFromNow, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { campaignProgress, isAdCopy, isCampaign, me, pitchesForRequest, requestsForBusiness } from "@/lib/selectors";
import { type DemoState, useDemo } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { ContentRequest } from "@/lib/types";

import { agoLower } from "./needs-you";

/** Pitches sent today or yesterday (demo clock). */
const recentPitches = (s: DemoState, requestId: string) =>
  pitchesForRequest(s, requestId).filter((p) => p.status !== "declined" && -daysFromNow(p.sentAt) <= 1);

/** How much attention an open order wants, for ordering the rows (review copies, then new pitches). */
function attention(s: DemoState, request: ContentRequest) {
  if (Date.parse(request.postedAt) > NOW - HOUR) return 1000;
  if (isCampaign(request)) return campaignProgress(s, request).review * 10;
  return recentPitches(s, request.id).length;
}

type Row = { key: string; icon: React.ReactNode; title: string; meta: string; highlight?: string; href: string };

function requestRow(s: DemoState, request: ContentRequest): Row {
  const campaign = isCampaign(request);
  const Icon = campaign ? Megaphone : formatById[request.brief.format].icon;
  if (request.status === "draft") {
    return {
      key: request.id,
      icon: <FilePen size={18} strokeWidth={1.75} />,
      title: request.title,
      meta: `Draft, not posted · saved ${agoLower(request.postedAt)}`,
      href: paths.newOrder({ draft: request.id }),
    };
  }
  let meta: string;
  let highlight: string | undefined;
  if (campaign) {
    const progress = campaignProgress(s, request);
    meta = `UGC campaign · ${progress.open} of ${progress.total} open`;
    if (progress.review) highlight = `${progress.review} to review`;
  } else {
    const pitches = pitchesForRequest(s, request.id).length;
    meta = `${isAdCopy(request) ? "Ad copy · " : ""}${pitches ? plural(pitches, "pitch", "pitches") : "No pitches yet"}`;
    const recent = recentPitches(s, request.id).length;
    if (recent) highlight = `${recent} new`;
  }
  if (Date.parse(request.postedAt) > NOW - HOUR) highlight = "just posted";
  return {
    key: request.id,
    icon: <Icon size={18} strokeWidth={1.75} />,
    title: request.title,
    meta,
    highlight,
    href: paths.order(request.id),
  };
}

/**
 * Ordered's "Your orders" (Work spec 6.4.4): posted UGC campaigns and custom orders, then drafts
 * (the new wizard's, one per kind, and older saved requests), as quiet rows. Each posted row opens
 * the owner's screen for that order (round 3 answers, item 33).
 */
export function YourOrders({ className = "", limit = 4 }: { className?: string; limit?: number }) {
  const s = useDemo();
  const requests = requestsForBusiness(s);
  const open = requests.filter((r) => r.status === "open").sort((a, b) => attention(s, b) - attention(s, a));
  const wizardDrafts: Row[] = me.orderDrafts(s).map((draft) => ({
    key: `draft-${draft.kind}`,
    icon: <FilePen size={18} strokeWidth={1.75} />,
    title: draft.title ?? (draft.kind === "campaign" ? "Untitled UGC campaign" : "Untitled custom order"),
    meta: `Draft, not posted · saved ${agoLower(draft.savedAt)}`,
    href: paths.newOrder({ draft: draft.kind }),
  }));
  const oldDrafts = requests.filter((r) => r.status === "draft").map((r) => requestRow(s, r));
  const rows = [...open.map((r) => requestRow(s, r)), ...wizardDrafts, ...oldDrafts];
  const shown = rows.slice(0, limit);

  return (
    <Block as="section" aria-labelledby="orders-title" tone="paper" pad="none" className={`y-side-card ${className}`}>
      <CardHead
        id="orders-title"
        as="h2"
        title="Your orders"
        count={open.length || undefined}
        aside={<Link href={paths.orders()}>All orders</Link>}
      />
      {shown.length ? (
        <ul className="flex flex-col">
          {shown.map((row) => (
            <li key={row.key} className="y-orow">
              <span className="y-orow-ic" aria-hidden>
                {row.icon}
              </span>
              <span className="min-w-0">
                <Link href={row.href} className="y-orow-link">
                  {row.title}
                </Link>
                <small>
                  {row.meta}
                  {row.highlight ? <em> · {row.highlight}</em> : null}
                </small>
              </span>
              <ChevronRight size={16} aria-hidden className="y-flip y-fg-3" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="y-small y-fg-2">
          Nothing open. A UGC campaign brings in many creators at one price; a custom order gets you pitches.
        </p>
      )}
    </Block>
  );
}
