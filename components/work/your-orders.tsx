"use client";

import { ChevronRight, Megaphone } from "lucide-react";
import Link from "next/link";

import { Block } from "@/components/ui/block";
import { daysFromNow, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { campaignProgress, isCampaign, pitchesForRequest, requestsForBusiness } from "@/lib/selectors";
import { type DemoState, useDemo } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { ContentRequest } from "@/lib/types";

import { agoLower } from "./needs-you";
import { BlockHeader, rowClass, stretched } from "./rows";

/** Pitches sent today or yesterday (demo clock). */
const recentPitches = (s: DemoState, requestId: string) =>
  pitchesForRequest(s, requestId).filter((p) => p.status !== "declined" && -daysFromNow(p.sentAt) <= 1);

/** How much attention an open order wants, for ordering the rows (review copies, then new pitches). */
function attention(s: DemoState, request: ContentRequest) {
  if (isCampaign(request)) return campaignProgress(s, request).review * 10;
  return recentPitches(s, request.id).length;
}

function OrderRow({ request }: { request: ContentRequest }) {
  const s = useDemo();
  const campaign = isCampaign(request);
  const draft = request.status === "draft";
  const FormatIcon = campaign ? Megaphone : formatById[request.brief.format].icon;
  const href = draft && !campaign ? paths.newOrder({ draft: request.id }) : paths.order(request.id);

  let meta: string;
  let highlight = "";
  if (draft) {
    meta = `Draft, not posted · saved ${agoLower(request.postedAt)}`;
  } else if (campaign) {
    const progress = campaignProgress(s, request);
    meta = `Campaign · ${progress.open} of ${progress.total} open`;
    if (progress.review) highlight = `${progress.review} to review`;
  } else {
    const pitches = pitchesForRequest(s, request.id).length;
    meta = pitches ? plural(pitches, "pitch", "pitches") : "No pitches yet";
    const recent = recentPitches(s, request.id).length;
    if (recent) highlight = `${recent} new`;
  }

  return (
    <li className={rowClass}>
      <span className="y-round flex-none" data-tone-btn="soft" data-size="sm" aria-hidden>
        <FormatIcon size={18} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="y-body truncate font-semibold">
          <Link href={href} className={stretched}>
            {request.title}
          </Link>
        </h3>
        <p className="y-micro y-fg-2 truncate">
          {meta}
          {highlight ? <span className="font-semibold text-(--b-fg)"> · {highlight}</span> : null}
        </p>
      </div>
      <ChevronRight size={18} aria-hidden className="y-flip y-fg-3 flex-none" />
    </li>
  );
}

/** Open orders (campaigns and custom requests) and drafts to finish, as up to three quiet rows. */
export function YourOrders({ className = "", limit = 3 }: { className?: string; limit?: number }) {
  const s = useDemo();
  const requests = requestsForBusiness(s);
  const open = requests
    .filter((r) => r.status === "open")
    .sort((a, b) => attention(s, b) - attention(s, a));
  const drafts = requests.filter((r) => r.status === "draft");
  const shown = [...open, ...drafts].slice(0, limit);

  return (
    <Block as="section" aria-labelledby="orders-title" tone="paper" pad="md" className={`flex flex-col gap-3 ${className}`}>
      <BlockHeader id="orders-title" title="Your orders" count={open.length} href={paths.orders()} linkLabel="All orders" />
      {shown.length ? (
        <ul className="flex flex-col">
          {shown.map((request) => (
            <OrderRow key={request.id} request={request} />
          ))}
        </ul>
      ) : (
        <p className="y-small y-fg-2">
          Nothing open. A campaign brings in many creators at a fixed price; a custom request gets you pitches.
        </p>
      )}
    </Block>
  );
}
