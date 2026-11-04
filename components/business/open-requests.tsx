"use client";

import { ArrowRight, FileClock, Sparkles, Star } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { AvatarStack } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { moneyRange, plural } from "@/lib/format";
import { creatorById, pitchesForRequest, productById, requestsForBusiness } from "@/lib/selectors";
import { useDemo } from "@/lib/store";

import { agoLower, recentPitches } from "./next-step";

/** Open requests with their pitches (faces, counts, what's new), plus drafts to finish. */
export function OpenRequests({ className = "" }: { className?: string }) {
  const s = useDemo();
  const requests = requestsForBusiness(s);
  const open = requests.filter((r) => r.status === "open");
  const drafts = requests.filter((r) => r.status === "draft");

  return (
    <Block as="section" aria-labelledby="requests-title" tone="paper" pad="md" className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="requests-title" className="y-display y-title">
          Open requests <span className="y-fg-3 y-num">{open.length}</span>
        </h2>
        <PillButton href="/business/requests" variant="ghost" size="sm" icon={<ArrowRight size={16} aria-hidden className="y-flip order-last" />}>
          All requests
        </PillButton>
      </div>

      {open.length || drafts.length ? (
        <ul className="flex flex-col gap-2">
          {open.map((request) => {
            const pitches = pitchesForRequest(s, request.id);
            const recent = recentPitches(s, request.id).length;
            const shortlisted = pitches.filter((p) => p.status === "shortlisted").length;
            const product = productById(s, request.brief.productId);
            const people = pitches
              .map((p) => creatorById(s, p.creatorId))
              .filter((c) => c !== undefined)
              .map((c) => ({ id: c.id, name: c.name }));
            const href = `/business/requests/${request.id}`;
            return (
              <li key={request.id} className="y-tile y-hoverable relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="y-micro y-fg-2 truncate">
                    {product?.name ?? "Product"} · {moneyRange(request.budget.min, request.budget.max)} · posted{" "}
                    {agoLower(request.postedAt)}
                  </p>
                  <h3 className="y-head">
                    <Link href={href} className="after:absolute after:inset-0 after:rounded-(--y-r-tile) after:content-['']">
                      {request.title}
                    </Link>
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    {people.length ? (
                      <span className="y-small inline-flex items-center gap-2 font-semibold">
                        <AvatarStack people={people} size={28} max={5} />
                        {plural(pitches.length, "pitch", "pitches")}
                      </span>
                    ) : (
                      <span className="y-small y-fg-2">No pitches yet. Most arrive within a day.</span>
                    )}
                    {recent ? (
                      <Badge tone="ink" icon={<Sparkles size={14} aria-hidden />}>
                        {recent} new since yesterday
                      </Badge>
                    ) : null}
                    {shortlisted ? (
                      <Badge tone="success" icon={<Star size={14} aria-hidden />}>
                        {shortlisted} shortlisted
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <PillButton href={href} variant="contrast" size="sm" className="relative z-[3] self-start sm:self-center">
                  Review pitches
                </PillButton>
              </li>
            );
          })}
          {drafts.map((request) => {
            const product = productById(s, request.brief.productId);
            const href = `/business/requests/new?draft=${request.id}`;
            return (
              <li key={request.id} className="y-hoverable relative flex flex-col gap-3 rounded-(--y-r-tile) p-4 shadow-[inset_0_0_0_1.5px_var(--b-line)] sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="y-micro y-fg-2 truncate">
                    {product?.name ?? "Product"} · saved {agoLower(request.postedAt)}
                  </p>
                  <h3 className="y-head">
                    <Link href={href} className="after:absolute after:inset-0 after:rounded-(--y-r-tile) after:content-['']">
                      {request.title}
                    </Link>
                  </h3>
                  <span>
                    <Badge tone="neutral" icon={<FileClock size={14} aria-hidden />}>
                      Draft · not posted
                    </Badge>
                  </span>
                </div>
                <PillButton href={href} variant="outline" size="sm" className="relative z-[3] self-start sm:self-center">
                  Finish your draft
                </PillButton>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="y-tile flex flex-col items-start gap-3 p-5">
          <p className="y-head">No open requests</p>
          <p className="y-small y-fg-2">
            Post one and creators who fit send pitches with their angle, price and samples.
          </p>
          <PillButton href="/business/requests/new" variant="contrast" size="sm">
            Post a request
          </PillButton>
        </div>
      )}
    </Block>
  );
}
