"use client";

import { BadgeCheck, Clock, Eye, MailOpen, Send, Sparkles, Users } from "lucide-react";
import Link from "next/link";

import { AvatarStack } from "@/components/ui/face-avatar";
import { daysFromNow, dueLabel, lengthLabel, moneyRange, plural, timeAgo } from "@/lib/format";
import type { Fit } from "@/lib/selectors";
import { businessById, creatorById, pitchesForRequest, productById } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { ContentRequest, Pitch } from "@/lib/types";

import { BusinessLogo } from "./business-logo";
import { languageList, platformList } from "./chips";
import { PitchBadge, RequestBadge } from "./status-badge";

/**
 * A content request as a card.
 * - perspective "creator": who's asking, what, budget, fit, invite and my pitch status.
 * - perspective "business": status, pitches with faces, views, due date.
 */
export function RequestCard({
  request,
  perspective,
  href,
  fit,
  pitch,
  invited = false,
  className = "",
}: {
  request: ContentRequest;
  perspective: "creator" | "business";
  href: string;
  fit?: Fit;
  pitch?: Pitch;
  invited?: boolean;
  className?: string;
}) {
  const s = useDemo();
  const business = businessById(s, request.businessId);
  const product = productById(s, request.brief.productId);
  const format = formatById[request.brief.format];
  const FormatIcon = format.icon;
  const pitches = pitchesForRequest(s, request.id);
  const due = dueLabel(request.dueDate);
  const isNew = -daysFromNow(request.postedAt) <= 1;

  return (
    <article data-tone="paper" className={`y-block y-hoverable relative flex flex-col gap-4 p-5 md:p-6 ${className}`}>
      <div className="flex items-start gap-3">
        {perspective === "creator" && business ? (
          <BusinessLogo business={business} size={44} />
        ) : (
          <span className="y-round flex-none" data-tone-btn="soft" aria-hidden>
            <FormatIcon size={20} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="y-micro y-fg-2 flex flex-wrap items-center gap-x-1.5">
            {perspective === "creator" && business ? (
              <>
                <span className="font-semibold text-(--b-fg)">{business.name}</span>
                {business.paymentVerified ? <BadgeCheck size={13} aria-label="Payment verified" /> : null}
                <span aria-hidden>·</span>
              </>
            ) : null}
            <span>{product?.name}</span>
            <span aria-hidden>·</span>
            <span>{request.status === "draft" ? "Not posted" : `Posted ${timeAgo(request.postedAt)}`}</span>
          </p>
          <h3 className="y-head mt-1">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-(--y-r-block) after:content-['']">
              {request.title}
            </Link>
          </h3>
        </div>
        {perspective === "creator" && fit ? (
          <span
            className="flex flex-none flex-col items-center rounded-[18px] bg-(--y-lavender) px-3 py-2 text-(--y-on-color)"
            aria-label={`${fit.score}% fit`}
          >
            <span className="y-display y-num text-[24px] leading-none font-semibold">{fit.score}</span>
            <span className="y-micro">fit</span>
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {invited ? (
          <span className="y-badge" data-tone-badge="ink">
            <MailOpen size={14} aria-hidden /> Invited you
          </span>
        ) : null}
        {perspective === "business" ? <RequestBadge status={request.status} /> : null}
        {perspective === "creator" && pitch ? <PitchBadge status={pitch.status} /> : null}
        {perspective === "creator" && isNew && !pitch ? (
          <span className="y-badge" data-tone-badge="info">
            <Sparkles size={14} aria-hidden /> New
          </span>
        ) : null}
        <span className="y-chip">
          <FormatIcon size={14} aria-hidden /> {format.name}
        </span>
        <span className="y-chip">
          {plural(request.brief.videoCount, "video")} · {lengthLabel(request.brief.durationSec)}
        </span>
        <span className="y-chip">{languageList(request.brief.languages)}</span>
        <span className="y-chip hidden sm:inline-flex">{platformList(request.brief.platforms)}</span>
      </div>

      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-(--b-line) pt-4">
        <div>
          <p className="y-micro y-fg-2">Budget</p>
          <p className="y-display y-num text-[24px] leading-tight font-semibold tracking-[-0.02em]">
            {moneyRange(request.budget.min, request.budget.max)}
          </p>
        </div>
        <div className="y-micro y-fg-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {request.status !== "draft" ? (
            <span className={`inline-flex items-center gap-1 ${due.urgency === "late" ? "text-(--y-danger)" : ""}`}>
              <Clock size={13} aria-hidden /> {due.text}
            </span>
          ) : null}
          {perspective === "business" ? (
            <>
              <span className="inline-flex items-center gap-1">
                <Eye size={13} aria-hidden /> {plural(request.views, "view")}
              </span>
              {pitches.length ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-(--b-fg)">
                  <AvatarStack
                    size={24}
                    max={4}
                    people={pitches
                      .map((p) => creatorById(s, p.creatorId))
                      .filter((c) => c !== undefined)
                      .map((c) => ({ id: c.id, name: c.name }))}
                  />
                  {plural(pitches.length, "pitch", "pitches")}
                </span>
              ) : request.status === "open" ? (
                <span className="inline-flex items-center gap-1">
                  <Send size={13} aria-hidden className="y-flip" /> Waiting for pitches
                </span>
              ) : null}
            </>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Users size={13} aria-hidden /> {plural(pitches.length, "pitch", "pitches")}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
