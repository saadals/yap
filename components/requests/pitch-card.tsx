"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  CalendarClock,
  ChevronDown,
  CircleCheck,
  MailOpen,
  MessageCircle,
  Star,
  Undo2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PitchBadge } from "@/components/domain/status-badge";
import { Rating } from "@/components/domain/stars";
import { VideoThumb } from "@/components/domain/video-thumb";
import { Badge } from "@/components/ui/badge";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { MatchExplain } from "@/components/ui/match-score";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { at } from "@/lib/clock";
import { daysFromNow, money, num, timeAgo, weekdayDate } from "@/lib/format";
import { cityById, videoById } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { creatorKindById } from "@/lib/taxonomy";
import type { ContentRequest, Creator } from "@/lib/types";

import type { RankedPitch } from "./shared";

export const responseLabel = (hours: number) =>
  hours < 1 ? "replies within an hour" : `replies in ~${Math.round(hours)}h`;

/** Price against the request budget, told honestly. */
export function budgetNote(price: number, budget: { min: number; max: number }) {
  if (price > budget.max) return { text: `${money(price - budget.max)} over your max`, over: true };
  if (price < budget.min) return { text: "Under your budget", over: false };
  return { text: "Within your budget", over: false };
}

/**
 * When the first version would land if hired today. Busy creators start when they're free,
 * so their clock starts at `availableFrom`.
 */
export function deliveryInfo(days: number, request: ContentRequest, creator?: Creator) {
  const waitDays =
    creator && !creator.available && creator.availableFrom ? Math.max(0, daysFromNow(creator.availableFrom)) : 0;
  const date = at(waitDays + days, "18:00");
  return {
    date,
    late: Date.parse(date) > Date.parse(request.dueDate),
    startsOn: waitDays ? creator?.availableFrom : undefined,
  };
}

export function TrustLine({ creator }: { creator: Creator }) {
  return (
    <span className="y-micro y-fg-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <Rating value={creator.rating} count={creator.reviewCount} className="!text-xs text-(--b-fg)" />
      <span aria-hidden>·</span>
      <span>{num(creator.completed)} done</span>
      <span aria-hidden>·</span>
      <span>{creator.onTimeRate}% on time</span>
      <span aria-hidden>·</span>
      <span>{responseLabel(creator.responseHours)}</span>
    </span>
  );
}

export function PitchCard({
  s,
  request,
  item,
  isNew,
  neon,
  canHire,
  commissionId,
  onHire,
  onMessage,
  onSample,
  onDecline,
  onRestore,
  onShortlist,
}: {
  s: DemoState;
  request: ContentRequest;
  item: RankedPitch;
  isNew: boolean;
  neon: boolean;
  canHire: boolean;
  commissionId?: string;
  onHire: () => void;
  onMessage: () => void;
  onSample: (videoId: string) => void;
  onDecline: () => void;
  onRestore: () => void;
  onShortlist: (on: boolean) => void;
}) {
  const { pitch, creator, fit } = item;
  const [showFit, setShowFit] = useState(false);
  const [more, setMore] = useState(false);
  const city = cityById(creator.cityId);
  const budget = budgetNote(pitch.price, request.budget);
  const delivery = deliveryInfo(pitch.deliveryDays, request, creator);
  const commissionDue = commissionId ? s.commissions.find((c) => c.id === commissionId)?.dueDate : undefined;
  const samples = pitch.sampleIds
    .map((id) => videoById(s, id))
    .filter((v) => v !== undefined);
  const shortlisted = pitch.status === "shortlisted";
  const declined = pitch.status === "declined";
  const hired = pitch.status === "hired";
  const invited = request.invitedCreatorIds.includes(creator.id);
  const headingId = `pitch-${pitch.id}`;
  const fitId = `pitch-fit-${pitch.id}`;

  if (declined) {
    return (
      <article
        aria-labelledby={headingId}
        data-tone="paper"
        className="y-block flex flex-wrap items-center gap-3 p-4 opacity-80 md:px-6"
      >
        <FaceAvatar id={creator.id} name="" size={40} />
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="y-small font-semibold">
            {creator.name}
          </h3>
          <p className="y-micro y-fg-2">
            {money(pitch.price)} · {pitch.deliveryDays} days · {fit.score}% fit
          </p>
        </div>
        <PitchBadge status="declined" />
        <PillButton size="sm" variant="ghost" icon={<Undo2 size={16} aria-hidden />} onClick={onRestore}>
          Reconsider
        </PillButton>
      </article>
    );
  }

  return (
    <article
      aria-labelledby={headingId}
      data-tone="paper"
      className={`y-block flex flex-col gap-5 p-5 md:p-6 ${hired ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""}`}
    >
      {/* Who */}
      <div className="flex items-start gap-3">
        <FaceAvatar id={creator.id} name="" size={52} />
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="y-head flex flex-wrap items-center gap-x-1.5">
            <Link href={`/creators/${creator.handle}`} className="hover:underline">
              {creator.name}
            </Link>
            {creator.verified ? <BadgeCheck size={17} aria-label="ID verified" className="flex-none" /> : null}
            {creator.topRated ? (
              <span className="y-micro inline-flex items-center gap-0.5 font-semibold">
                <Zap size={12} aria-hidden className="fill-current" /> Top rated
              </span>
            ) : null}
          </h3>
          <p className="y-micro y-fg-2">
            {creatorKindById[creator.kind].name} · {city?.name} · pitched {timeAgo(pitch.sentAt)}
          </p>
          <div className="mt-1">
            <TrustLine creator={creator} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowFit((v) => !v)}
          aria-expanded={showFit}
          aria-controls={fitId}
          className="flex flex-none flex-col items-center rounded-[18px] bg-(--y-lavender) px-3 py-2 text-(--y-on-color) transition-transform active:scale-95"
        >
          <span className="y-display y-num text-[24px] leading-none font-semibold">{fit.score}</span>
          <span className="y-micro inline-flex items-center gap-0.5">
            fit <ChevronDown size={12} aria-hidden className={showFit ? "rotate-180" : ""} />
          </span>
          <span className="sr-only">. {showFit ? "Hide" : "Show"} why</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {hired ? <PitchBadge status="hired" /> : null}
        {shortlisted ? <PitchBadge status="shortlisted" /> : null}
        {isNew && !shortlisted && !hired ? (
          <Badge tone="info" icon={<Bell size={14} aria-hidden />}>
            New
          </Badge>
        ) : null}
        {invited ? (
          <Badge tone="neutral" icon={<MailOpen size={14} aria-hidden />}>
            You invited them
          </Badge>
        ) : null}
        {budget.over ? (
          <Badge tone="warning" icon={<AlertTriangle size={14} aria-hidden />}>
            {budget.text}
          </Badge>
        ) : null}
        {delivery.late && !hired ? (
          <Badge tone="warning" icon={<CalendarClock size={14} aria-hidden />}>
            After your deadline
          </Badge>
        ) : null}
        {!creator.available && !hired ? (
          <Badge tone="neutral" icon={<CalendarClock size={14} aria-hidden />}>
            Busy until {creator.availableFrom ? weekdayDate(creator.availableFrom) : "soon"}
          </Badge>
        ) : null}
      </div>

      {showFit ? (
        <div id={fitId} data-tone="lavender" className="y-block flex flex-col gap-3 !rounded-(--y-r-tile) p-4">
          <p className="y-small font-semibold">Why {fit.score}% fit</p>
          <MatchExplain reasons={fit.reasons} gaps={fit.gaps} />
        </div>
      ) : (
        <span id={fitId} hidden />
      )}

      {/* The idea */}
      <div className="flex flex-col gap-1.5">
        <p className="y-micro y-fg-2">Their angle</p>
        <p dir="auto" className="y-display text-[22px] leading-snug md:text-[24px]">
          &ldquo;{pitch.angle}&rdquo;
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <p dir="auto" className={`y-body max-w-[68ch] whitespace-pre-line ${more ? "" : "line-clamp-3"}`}>
          {pitch.message}
        </p>
        {pitch.message.length > 220 ? (
          <button
            type="button"
            className="y-small y-link w-fit font-semibold"
            aria-expanded={more}
            onClick={() => setMore((v) => !v)}
          >
            {more ? "Show less" : "Read the whole pitch"}
          </button>
        ) : null}
      </div>

      {/* Terms */}
      <dl className="grid grid-cols-2 gap-2">
        <div className="y-tile flex flex-col gap-0.5 p-4">
          <dt className="y-micro y-fg-2">Quote</dt>
          <dd className="y-display y-num text-[28px] leading-tight font-semibold tracking-[-0.02em]">
            {money(pitch.price)}
          </dd>
          <dd className={`y-micro ${budget.over ? "font-semibold text-(--y-warning)" : "y-fg-2"}`}>{budget.text}</dd>
        </div>
        <div className="y-tile flex flex-col gap-0.5 p-4">
          <dt className="y-micro y-fg-2">First version</dt>
          <dd className="y-display y-num text-[28px] leading-tight font-semibold tracking-[-0.02em]">
            {pitch.deliveryDays} days
          </dd>
          {hired && commissionDue ? (
            <dd className="y-micro y-fg-2">Due {weekdayDate(commissionDue)}</dd>
          ) : (
            <dd className={`y-micro ${delivery.late ? "font-semibold text-(--y-warning)" : "y-fg-2"}`}>
              {delivery.startsOn ? `Starts ${weekdayDate(delivery.startsOn)}, ready ` : "By "}
              {weekdayDate(delivery.date)}
              {delivery.late ? `, after your ${weekdayDate(request.dueDate)} deadline` : ""}
            </dd>
          )}
        </div>
      </dl>

      {samples.length ? (
        <div className="flex flex-col gap-2">
          <p className="y-micro y-fg-2">Samples they picked for you</p>
          <ul className="flex gap-2">
            {samples.slice(0, 3).map((video) => (
              <li key={video.id} className="w-[30%] max-w-32 min-w-0">
                <button
                  type="button"
                  className="group block w-full rounded-(--y-r-tile) text-start"
                  onClick={() => onSample(video.id)}
                  aria-label={`Play sample: ${video.title}`}
                >
                  <VideoThumb video={video} frame="9:16" playable showHook={false} decorative />
                  <span className="y-micro y-fg-2 mt-1 line-clamp-2 block">{video.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Decide */}
      <div className="flex flex-wrap items-center gap-2 border-t border-(--b-line) pt-4">
        {hired ? (
          commissionId ? (
            <PillButton href={`/business/commissions/${commissionId}`} variant="contrast" arrow>
              Open commission
            </PillButton>
          ) : (
            <Badge tone="ink" icon={<CircleCheck size={14} aria-hidden />}>
              Hired
            </Badge>
          )
        ) : canHire ? (
          <PillButton variant={neon ? "neon" : "contrast"} arrow={neon} onClick={onHire}>
            Hire {creator.firstName}
          </PillButton>
        ) : null}
        {!hired ? (
          <RoundIconButton
            label={shortlisted ? `Remove ${creator.firstName} from shortlist` : `Shortlist ${creator.firstName}`}
            aria-pressed={shortlisted}
            onClick={() => onShortlist(!shortlisted)}
          >
            <Star size={20} aria-hidden className={shortlisted ? "fill-current" : ""} />
          </RoundIconButton>
        ) : null}
        <PillButton variant="outline" icon={<MessageCircle size={18} aria-hidden />} onClick={onMessage}>
          Message
        </PillButton>
        <PillButton href={`/creators/${creator.handle}`} variant="ghost">
          View profile
        </PillButton>
        {!hired ? (
          <PillButton
            variant="ghost"
            className="ms-auto"
            icon={<X size={16} aria-hidden />}
            onClick={onDecline}
            aria-label={`Decline ${creator.firstName}'s pitch`}
          >
            Decline
          </PillButton>
        ) : null}
      </div>
    </article>
  );
}
