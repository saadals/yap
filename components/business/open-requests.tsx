"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Block } from "@/components/ui/block";
import { plural } from "@/lib/format";
import { pitchesForRequest, requestsForBusiness } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { ContentRequest } from "@/lib/types";

import { BlockHeader, rowClass, stretched } from "./in-progress";
import { agoLower, recentPitches } from "./next-step";

function RequestRow({ request }: { request: ContentRequest }) {
  const s = useDemo();
  const FormatIcon = formatById[request.brief.format].icon;
  const draft = request.status === "draft";
  const pitches = pitchesForRequest(s, request.id).length;
  const recent = draft ? 0 : recentPitches(s, request.id).length;
  const href = draft ? `/business/requests/new?draft=${request.id}` : `/business/requests/${request.id}`;

  const meta = draft
    ? `Draft, not posted · saved ${agoLower(request.postedAt)}`
    : pitches
      ? plural(pitches, "pitch", "pitches")
      : "No pitches yet";

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
          {recent ? <span className="font-semibold text-(--b-fg)"> · {recent} new since yesterday</span> : null}
        </p>
      </div>
      <ChevronRight size={18} aria-hidden className="y-flip y-fg-3 flex-none" />
    </li>
  );
}

/** Open requests (newest pitches first) and drafts to finish, as quiet rows. */
export function OpenRequests({ className = "", limit = 3 }: { className?: string; limit?: number }) {
  const s = useDemo();
  const requests = requestsForBusiness(s);
  const open = requests
    .filter((r) => r.status === "open")
    .sort((a, b) => recentPitches(s, b.id).length - recentPitches(s, a.id).length);
  const drafts = requests.filter((r) => r.status === "draft");
  const shown = [...open, ...drafts].slice(0, limit);

  return (
    <Block as="section" aria-labelledby="requests-title" tone="paper" pad="md" className={`flex flex-col gap-3 ${className}`}>
      <BlockHeader id="requests-title" title="Open requests" count={open.length} href="/business/requests" />
      {shown.length ? (
        <ul className="flex flex-col">
          {shown.map((request) => (
            <RequestRow key={request.id} request={request} />
          ))}
        </ul>
      ) : (
        <p className="y-small y-fg-2">
          No open requests. Post one and creators who fit send pitches, usually within a day.
        </p>
      )}
    </Block>
  );
}
