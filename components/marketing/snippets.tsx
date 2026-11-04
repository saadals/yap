"use client";

import { CheckCircle2, MessageSquareText, Repeat2, ShieldCheck, Sparkles } from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { FormatChip, languageList } from "@/components/domain/chips";
import { PitchBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { clock, lengthLabel, money, moneyRange, plural, priceBreakdown } from "@/lib/format";
import {
  businessById,
  creatorById,
  pitchesForRequest,
  productById,
  requestById,
} from "@/lib/selectors";
import { useDemo } from "@/lib/store";

/**
 * Small, non-interactive product snippets that illustrate a step on marketing pages. They read
 * real demo data (Daftar's open request, its pitches, its product learnings) so the story matches
 * what a visitor finds after signing in.
 */

const DEMO_REQUEST = "r-101";
const DEMO_PRODUCT = "p-daftar-invoices";
const DEMO_CREATOR = "cr-layla";

/** Snippet surface: paper on colour blocks, mist when the parent block is already paper. */
export type SnippetTone = "paper" | "mist";

function Shell({
  children,
  className = "",
  label,
  tone = "paper",
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
  tone?: SnippetTone;
}) {
  return (
    <figure
      data-tone={tone}
      aria-label={label}
      className={`y-block flex flex-col gap-3 !rounded-[24px] p-4 ${className}`}
    >
      {children}
    </figure>
  );
}

/** Step 1: a content request as the business wrote it. */
export function MiniBrief({ className = "", tone }: { className?: string; tone?: SnippetTone }) {
  const s = useDemo();
  const request =
    requestById(s, DEMO_REQUEST) ?? s.requests.find((r) => r.status === "open");
  if (!request) return null;
  const business = businessById(s, request.businessId);
  const product = productById(s, request.brief.productId);
  const learnings = product?.learnings.length ?? 0;
  return (
    <Shell className={className} tone={tone} label="Example content request">
      <div className="flex items-center gap-3">
        {business ? <BusinessLogo business={business} size={40} /> : null}
        <div className="min-w-0">
          <p className="y-micro y-fg-2 truncate">
            {business?.name} · {product?.name}
          </p>
          <p className="y-small truncate font-semibold">{request.title}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <FormatChip id={request.brief.format} />
        <Chip>{languageList(request.brief.languages)}</Chip>
        <Chip>
          {plural(request.brief.videoCount, "video")} · {lengthLabel(request.brief.durationSec)}
        </Chip>
      </div>
      <div className="flex items-end justify-between gap-3 border-t border-(--b-line) pt-3">
        <span>
          <span className="y-micro y-fg-2 block">Budget</span>
          <span className="y-display y-num text-[22px] leading-tight font-semibold tracking-[-0.02em]">
            {moneyRange(request.budget.min, request.budget.max)}
          </span>
        </span>
        {learnings ? (
          <span className="y-micro y-fg-2 inline-flex items-center gap-1.5">
            <Sparkles size={14} aria-hidden />
            {plural(learnings, "learning")} carried in
          </span>
        ) : null}
      </div>
    </Shell>
  );
}

/** Step 2: creators pitch with an angle, a price and a turnaround. */
export function MiniPitches({
  className = "",
  count = 2,
  tone = "paper",
}: {
  className?: string;
  count?: number;
  tone?: SnippetTone;
}) {
  const s = useDemo();
  const pitches = pitchesForRequest(s, DEMO_REQUEST)
    .slice()
    .sort((a, b) => Number(b.status === "shortlisted") - Number(a.status === "shortlisted"))
    .slice(0, count);
  if (!pitches.length) return null;
  return (
    <div className={`flex flex-col gap-2 ${className}`} role="list" aria-label="Example pitches">
      {pitches.map((pitch) => {
        const creator = creatorById(s, pitch.creatorId);
        if (!creator) return null;
        return (
          <div
            key={pitch.id}
            role="listitem"
            data-tone={tone}
            className="y-block flex flex-col gap-2.5 !rounded-[22px] p-3.5"
          >
            <div className="flex items-center gap-3">
              <FaceAvatar id={creator.id} name="" size={40} />
              <div className="min-w-0 flex-1">
                <p className="y-small truncate font-semibold">{creator.name}</p>
                <p className="y-micro y-fg-2 truncate">
                  <span className="y-num">{money(pitch.price)}</span> ·{" "}
                  {plural(pitch.deliveryDays, "day")} · ★ {creator.rating.toFixed(1)}
                </p>
              </div>
              {pitch.status === "shortlisted" ? <PitchBadge status={pitch.status} /> : null}
            </div>
            <p className="y-micro y-fg-2 y-clamp-2">
              <span className="font-semibold text-(--b-fg)">Angle: </span>
              {pitch.angle}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** Step 3: delivery review with a timestamped note, then approve and release. */
export function MiniReview({ className = "", tone }: { className?: string; tone?: SnippetTone }) {
  const s = useDemo();
  const creator = creatorById(s, DEMO_CREATOR) ?? s.creators[0];
  if (!creator) return null;
  const standard = creator.packages.find((p) => p.tier === "standard") ?? creator.packages[0];
  const totals = priceBreakdown(standard?.price ?? 0);
  const duration = 40;
  const noteAt = 12;
  return (
    <Shell className={className} tone={tone} label="Example delivery review">
      <div className="flex items-center gap-3">
        <FaceAvatar id={creator.id} name="" size={40} />
        <div className="min-w-0 flex-1">
          <p className="y-small truncate font-semibold">Version 2 from {creator.firstName}</p>
          <p className="y-micro y-fg-2">Selfie demo · {clock(duration)}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2" aria-hidden>
        <div className="relative h-2 rounded-full bg-(--b-line)">
          <span className="absolute inset-y-0 start-0 w-[64%] rounded-full bg-(--b-fg)" />
          <span
            className="absolute top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-(--y-lavender) text-[10px] font-bold text-(--y-on-color) ring-2 ring-(--b-bg)"
            style={{ left: `${(noteAt / duration) * 100}%` }}
          >
            1
          </span>
        </div>
        <div className="y-micro y-fg-3 flex justify-between">
          <span className="y-num">0:00</span>
          <span className="y-num">{clock(duration)}</span>
        </div>
      </div>
      <div className="y-tile flex items-start gap-2.5 p-3">
        <MessageSquareText size={16} aria-hidden className="mt-0.5 flex-none" />
        <p className="y-micro">
          <span className="y-num font-semibold">{clock(noteAt)}</span> · Slow down on the invoice
          screen so people can read it.
          <span className="y-fg-2 mt-1 flex items-center gap-1">
            <CheckCircle2 size={12} aria-hidden /> Fixed in version 2
          </span>
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-(--b-line) pt-3">
        <Badge tone="success" icon={<CheckCircle2 size={14} aria-hidden />}>
          Approved
        </Badge>
        <span className="y-micro y-fg-2 inline-flex items-center gap-1.5">
          <ShieldCheck size={14} aria-hidden />
          <span className="y-num font-semibold text-(--b-fg)">{money(totals.subtotal)}</span>{" "}
          released to {creator.firstName}
        </span>
      </div>
    </Shell>
  );
}

/** Product context with saved learnings, as it carries into the next brief. */
export function MiniLearnings({
  className = "",
  max = 3,
  tone,
}: {
  className?: string;
  max?: number;
  tone?: SnippetTone;
}) {
  const s = useDemo();
  const product = productById(s, DEMO_PRODUCT) ?? s.products.find((p) => p.learnings.length);
  if (!product) return null;
  const business = businessById(s, product.businessId);
  const shown = product.learnings.slice(0, max);
  return (
    <Shell className={className} tone={tone} label={`Saved product context for ${product.name}`}>
      <div className="flex items-center gap-3">
        {business ? <BusinessLogo business={business} size={40} /> : null}
        <div className="min-w-0 flex-1">
          <p className="y-small truncate font-semibold">{product.name}</p>
          <p className="y-micro y-fg-2 truncate">{product.oneLiner}</p>
        </div>
        <Badge tone="neutral" icon={<Repeat2 size={14} aria-hidden />}>
          Carried forward
        </Badge>
      </div>
      <ul className="flex flex-col gap-1.5">
        {shown.map((learning) => {
          const from = learning.creatorId ? creatorById(s, learning.creatorId) : undefined;
          return (
            <li key={learning.id} className="y-tile flex items-start gap-2.5 p-3">
              <Sparkles size={15} aria-hidden className="mt-0.5 flex-none" />
              <span className="y-micro">
                {learning.text}
                {from ? (
                  <span className="y-fg-2 mt-0.5 block">From {from.firstName}&apos;s commission</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      {product.learnings.length > shown.length ? (
        <p className="y-micro y-fg-2">
          +{product.learnings.length - shown.length} more saved to {product.name}
        </p>
      ) : null}
    </Shell>
  );
}
