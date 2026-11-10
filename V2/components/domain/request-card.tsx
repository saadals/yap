"use client";

import { Megaphone, MailOpen, Sparkles } from "lucide-react";
import Link from "next/link";

import { AvatarStack } from "@/components/ui/face-avatar";
import { compact, daysFromNow, dueLabel, lengthLabel, money, moneyRange, plural, timeAgo } from "@/lib/format";
import type { Fit } from "@/lib/selectors";
import {
  businessById,
  campaignProgress,
  creatorById,
  isCampaign,
  openSlotCount,
  pitchesForRequest,
  productById,
} from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { campaignPlatformById, formatById, tierById } from "@/lib/taxonomy";
import type { Business, ContentRequest, Pitch, Product } from "@/lib/types";

import { BusinessLogo } from "./business-logo";
import { languageList } from "./chips";
import { PitchBadge, RequestBadge } from "./status-badge";

/** "Roundleaf · 2 days ago", "Daftar · Daftar Stock · 1h ago": the brand only when it isn't the product's name too. */
function postedLine(request: ContentRequest, business: Business | undefined, product: Product | undefined): string {
  const names = [business?.name, product?.name].filter((name): name is string => Boolean(name));
  const unique = names.filter((name, index) => names.indexOf(name) === index);
  return [...unique, request.status === "draft" ? "Not posted yet" : timeAgo(request.postedAt)].join(" · ");
}

/**
 * An order as a card (custom request or UGC campaign).
 * - perspective "creator": who's asking, what, budget, fit, invite and my pitch status.
 *   Campaigns: price per Yapp, tier, slots left.
 * - perspective "business": status, pitches with faces, views, due date. Campaigns: slots filled.
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
  if (isCampaign(request)) {
    return <CampaignCard request={request} perspective={perspective} href={href} className={className} />;
  }
  return (
    <CustomRequestCard
      request={request}
      perspective={perspective}
      href={href}
      fit={fit}
      pitch={pitch}
      invited={invited}
      className={className}
      s={s}
    />
  );
}

function CustomRequestCard({
  request,
  perspective,
  href,
  fit,
  pitch,
  invited,
  className,
  s,
}: {
  request: ContentRequest;
  perspective: "creator" | "business";
  href: string;
  fit?: Fit;
  pitch?: Pitch;
  invited: boolean;
  className: string;
  s: ReturnType<typeof useDemo>;
}) {
  const business = businessById(s, request.businessId);
  const product = productById(s, request.brief.productId);
  const format = formatById[request.brief.format];
  const FormatIcon = format.icon;
  const pitches = pitchesForRequest(s, request.id);
  const due = dueLabel(request.dueDate);
  const isNew = -daysFromNow(request.postedAt) <= 1;

  // One badge at most: what matters most to this viewer.
  const badge =
    perspective === "business" ? (
      request.status !== "open" ? <RequestBadge status={request.status} /> : null
    ) : pitch ? (
      <PitchBadge status={pitch.status} />
    ) : invited ? (
      <span className="y-badge" data-tone-badge="ink">
        <MailOpen size={14} aria-hidden /> Invited you
      </span>
    ) : isNew ? (
      <span className="y-badge" data-tone-badge="info">
        <Sparkles size={14} aria-hidden /> New
      </span>
    ) : null;

  const meta = [
    format.name,
    `${request.brief.videoCount} × ${lengthLabel(request.brief.durationSec)}`,
    languageList(request.brief.languages),
  ].join(" · ");

  return (
    <article data-tone="paper" className={`y-block y-hoverable relative flex flex-col gap-4 p-5 md:p-6 ${className}`}>
      <div className="flex items-start gap-3">
        {perspective === "creator" && business ? (
          <BusinessLogo business={business} size={40} />
        ) : (
          <span className="y-round flex-none" data-tone-btn="soft" data-size="sm" aria-hidden>
            <FormatIcon size={18} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="y-micro y-fg-2 truncate">{postedLine(request, perspective === "creator" ? business : undefined, product)}</p>
          <h3 className="y-head mt-0.5">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-(--y-r-block) after:content-['']">
              {request.title}
            </Link>
          </h3>
          <p className="y-small y-fg-2 mt-1">{meta}</p>
        </div>
        {perspective === "creator" && fit ? (
          <span className="y-display y-num flex-none text-[22px] leading-none font-semibold" aria-label={`${fit.score}% fit`}>
            {fit.score}
            <span className="y-micro y-fg-2 ms-0.5 font-medium">% fit</span>
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-(--b-line) pt-4">
        <span className="flex items-center gap-3">
          <span className="y-display y-num text-[20px] font-semibold tracking-[-0.02em]">
            {moneyRange(request.budget.min, request.budget.max)}
          </span>
          {badge}
        </span>
        <span className="y-micro y-fg-2 flex items-center gap-3">
          {request.status !== "draft" ? (
            <span className={due.urgency === "late" ? "text-(--y-danger)" : ""}>{due.text}</span>
          ) : null}
          {perspective === "business" && pitches.length ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-(--b-fg)">
              <AvatarStack
                size={22}
                max={3}
                people={pitches
                  .map((p) => creatorById(s, p.creatorId))
                  .filter((c) => c !== undefined)
                  .map((c) => ({ id: c.id, name: c.name }))}
              />
              {plural(pitches.length, "pitch", "pitches")}
            </span>
          ) : perspective === "business" && request.status === "open" ? (
            <span>No pitches yet</span>
          ) : perspective === "creator" ? (
            <span>{plural(pitches.length, "pitch", "pitches")}</span>
          ) : null}
        </span>
      </div>
    </article>
  );
}

/** A UGC campaign as a card: price per Yapp, tier, and how many slots are left (or filled). */
function CampaignCard({
  request,
  perspective,
  href,
  className,
}: {
  request: ContentRequest;
  perspective: "creator" | "business";
  href: string;
  className: string;
}) {
  const s = useDemo();
  const business = businessById(s, request.businessId);
  const product = productById(s, request.brief.productId);
  const terms = request.campaign!;
  const tier = tierById[terms.tierId];
  const open = openSlotCount(s, request);
  const progress = campaignProgress(s, request);
  const meta = [
    `UGC campaign on ${campaignPlatformById[terms.platform].name}`,
    `${tier.label} followers`,
    languageList(request.brief.languages),
  ].join(" · ");

  return (
    <article data-tone="paper" className={`y-block y-hoverable relative flex flex-col gap-4 p-5 md:p-6 ${className}`}>
      <div className="flex items-start gap-3">
        {perspective === "creator" && business ? (
          <BusinessLogo business={business} size={40} />
        ) : (
          <span className="y-round flex-none" data-tone-btn="soft" data-size="sm" aria-hidden>
            <Megaphone size={18} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="y-micro y-fg-2 truncate">{postedLine(request, perspective === "creator" ? business : undefined, product)}</p>
          <h3 className="y-head mt-0.5">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-(--y-r-block) after:content-['']">
              {request.title}
            </Link>
          </h3>
          <p className="y-small y-fg-2 mt-1">{meta}</p>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-(--b-line) pt-4">
        <span className="flex items-baseline gap-1.5">
          <span className="y-display y-num text-[20px] font-semibold tracking-[-0.02em]">{money(terms.pricePerVideo)}</span>
          <span className="y-micro y-fg-2">per Yapp</span>
        </span>
        <span className="y-micro y-fg-2 flex items-center gap-3">
          {perspective === "business" ? (
            <span className="font-semibold text-(--b-fg)">
              {progress.taken} of {progress.total} taken
              {progress.review ? ` · ${progress.review} to review` : ""}
            </span>
          ) : request.status === "closed" ? (
            <span>Closed</span>
          ) : open === 0 ? (
            <span>All slots taken</span>
          ) : (
            <span className="font-semibold text-(--b-fg)">
              {open <= 3 ? `Only ${plural(open, "Yapp")} left` : `${open} of ${request.slots} slots open`}
            </span>
          )}
          {perspective === "creator" ? <span>{compact(request.views)} views</span> : null}
        </span>
      </div>
    </article>
  );
}
