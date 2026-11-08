"use client";

import { AlertTriangle, BadgeCheck, Bell, ChevronDown, MessageCircle, Star, Undo2, X } from "lucide-react";
import { useState } from "react";

import { PitchBadge } from "@/components/domain/status-badge";
import { Rating } from "@/components/domain/stars";
import { VideoThumb } from "@/components/domain/video-thumb";
import { Badge } from "@/components/ui/badge";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { MatchExplain } from "@/components/ui/match-score";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { Sheet } from "@/components/ui/sheet";
import { at } from "@/lib/clock";
import { daysFromNow, money, num, timeAgo, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
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

/** Stars, or "New on Yapp" for a creator profile with no reviews yet. */
function RatingOrNew({ creator, count = false, className }: { creator: Creator; count?: boolean; className?: string }) {
  if (!creator.reviewCount) return <span className={className}>New on Yapp</span>;
  return <Rating value={creator.rating} count={count ? creator.reviewCount : undefined} className={className} />;
}

export function TrustLine({ creator }: { creator: Creator }) {
  return (
    <span className="y-micro y-fg-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <RatingOrNew creator={creator} count className="!text-xs text-(--b-fg)" />
      <span aria-hidden>·</span>
      <span>{num(creator.completed)} done</span>
      <span aria-hidden>·</span>
      <span>{creator.onTimeRate}% on time</span>
      <span aria-hidden>·</span>
      <span>{responseLabel(creator.responseHours)}</span>
    </span>
  );
}

/**
 * A pitch as one summary row: who, the angle in a line, fit, price, days, shortlist star.
 * The whole row opens the full pitch (`PitchSheet`).
 */
export function PitchRow({
  request,
  item,
  isNew,
  onOpen,
  onShortlist,
  onRestore,
}: {
  request: ContentRequest;
  item: RankedPitch;
  isNew: boolean;
  onOpen: () => void;
  onShortlist: (on: boolean) => void;
  onRestore: () => void;
}) {
  const { pitch, creator, fit } = item;
  const shortlisted = pitch.status === "shortlisted";
  const declined = pitch.status === "declined";
  const hired = pitch.status === "hired";
  const over = pitch.price > request.budget.max;
  const late = !hired && deliveryInfo(pitch.deliveryDays, request, creator).late;

  const price = (
    <span className={over ? "inline-flex items-center gap-1 text-(--y-warning)" : ""}>
      {over ? <AlertTriangle size={13} aria-hidden /> : null}
      {money(pitch.price)}
      {over ? <span className="sr-only"> (over your max)</span> : null}
    </span>
  );
  const days = (
    <span className={late ? "inline-flex items-center gap-1 text-(--y-warning)" : ""}>
      {late ? <AlertTriangle size={13} aria-hidden /> : null}
      {pitch.deliveryDays} days
      {late ? <span className="sr-only"> (after your deadline)</span> : null}
    </span>
  );

  return (
    <li
      className={`relative flex items-center gap-3 rounded-(--y-r-tile) px-3 py-3 transition-colors hover:bg-(--b-chip) md:gap-4 md:px-4 ${declined ? "opacity-70" : ""}`}
    >
      <FaceAvatar id={creator.id} name="" size={44} />
      <div className="min-w-0 flex-1">
        <h3 className="y-small flex items-center gap-1.5 font-semibold">
          <button
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            className="truncate text-start outline-none after:absolute after:inset-0 after:rounded-(--y-r-tile) after:content-[''] focus-visible:after:shadow-[inset_0_0_0_2px_var(--b-fg)]"
          >
            {creator.name}
          </button>
          {creator.verified ? <BadgeCheck size={14} aria-label="ID verified" className="flex-none" /> : null}
          <span className="hidden flex-none md:inline-flex">
            <RatingOrNew creator={creator} className="!text-xs font-medium" />
          </span>
          {hired ? (
            <PitchBadge status="hired" className="ms-1 flex-none" />
          ) : isNew && !declined && !shortlisted ? (
            <Badge tone="info" icon={<Bell size={12} aria-hidden />} className="ms-1 !min-h-6 flex-none !px-2 !text-[11px]">
              New
            </Badge>
          ) : null}
        </h3>
        <p className="y-micro y-fg-2 flex flex-wrap items-center gap-x-1.5 md:hidden">
          <RatingOrNew creator={creator} className="!text-xs font-medium text-(--b-fg)" />
          <span aria-hidden>·</span>
          <span>{fit.score}% fit</span>
          <span aria-hidden>·</span>
          {price}
          <span aria-hidden>·</span>
          {days}
        </p>
        <p dir="auto" className="y-small y-fg-2 mt-0.5 line-clamp-1">
          &ldquo;{pitch.angle}&rdquo;
        </p>
      </div>
      <p className="y-small y-num hidden flex-none items-center font-semibold md:flex">
        <span className="w-20 text-end">
          {fit.score}
          <span className="y-fg-2 font-normal">% fit</span>
        </span>
        <span className="w-20 text-end">{price}</span>
        <span className="w-20 text-end">{days}</span>
      </p>
      <span className="relative z-[3] flex-none">
        {declined ? (
          <>
            <RoundIconButton size="sm" className="!bg-transparent md:!hidden" label={`Reconsider ${creator.firstName}'s pitch`} onClick={onRestore}>
              <Undo2 size={18} aria-hidden />
            </RoundIconButton>
            <PillButton size="sm" variant="ghost" className="!hidden md:!inline-flex" icon={<Undo2 size={16} aria-hidden />} onClick={onRestore}>
              Reconsider
            </PillButton>
          </>
        ) : hired ? (
          <span className="block size-10" aria-hidden />
        ) : (
          <RoundIconButton
            size="sm"
            tone={shortlisted ? "contrast" : "soft"}
            className={shortlisted ? "" : "!bg-transparent"}
            label={shortlisted ? `Remove ${creator.firstName} from shortlist` : `Shortlist ${creator.firstName}`}
            aria-pressed={shortlisted}
            onClick={() => onShortlist(!shortlisted)}
          >
            <Star size={18} aria-hidden className={shortlisted ? "fill-current" : ""} />
          </RoundIconButton>
        )}
      </span>
    </li>
  );
}

/** The full pitch: angle, message, terms, samples and the decision. Mounted only while open. */
export function PitchSheet({
  s,
  request,
  item,
  canHire,
  commissionId,
  onClose,
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
  canHire: boolean;
  commissionId?: string;
  onClose: () => void;
  onHire: () => void;
  onMessage: () => void;
  onSample: (videoId: string) => void;
  onDecline: () => void;
  onRestore: () => void;
  onShortlist: (on: boolean) => void;
}) {
  const { pitch, creator, fit } = item;
  const [showFit, setShowFit] = useState(false);
  const city = cityById(creator.cityId);
  const budget = budgetNote(pitch.price, request.budget);
  const delivery = deliveryInfo(pitch.deliveryDays, request, creator);
  const commissionDue = commissionId ? s.commissions.find((c) => c.id === commissionId)?.dueDate : undefined;
  const samples = pitch.sampleIds.map((id) => videoById(s, id)).filter((v) => v !== undefined);
  const shortlisted = pitch.status === "shortlisted";
  const declined = pitch.status === "declined";
  const hired = pitch.status === "hired";
  const invited = request.invitedCreatorIds.includes(creator.id);
  const fitId = `pitch-fit-${pitch.id}`;

  const primary = hired ? (
    commissionId ? (
      <PillButton href={paths.commission(commissionId)} variant="neon" size="lg" arrow className="flex-1 justify-between ps-6">
        Open commission
      </PillButton>
    ) : null
  ) : declined ? (
    <PillButton variant="contrast" size="lg" className="flex-1" icon={<Undo2 size={18} aria-hidden />} onClick={onRestore}>
      Reconsider
    </PillButton>
  ) : canHire ? (
    <PillButton variant="neon" size="lg" arrow className="flex-1 justify-between ps-6" onClick={onHire}>
      Hire {creator.firstName}
    </PillButton>
  ) : null;

  return (
    <Sheet
      open
      onClose={onClose}
      title={creator.name}
      description={`${creatorKindById[creator.kind].name} · ${city?.name} · pitched ${timeAgo(pitch.sentAt)}${invited ? " · you invited them" : ""}`}
      width="md"
      footer={
        <div className="flex gap-2">
          {primary}
          {!hired && !declined ? (
            <RoundIconButton
              size="lg"
              tone={shortlisted ? "contrast" : "outline"}
              label={shortlisted ? `Remove ${creator.firstName} from shortlist` : `Shortlist ${creator.firstName}`}
              aria-pressed={shortlisted}
              onClick={() => onShortlist(!shortlisted)}
            >
              <Star size={20} aria-hidden className={shortlisted ? "fill-current" : ""} />
            </RoundIconButton>
          ) : null}
          {primary ? (
            <RoundIconButton size="lg" tone="outline" className="md:!hidden" label={`Message ${creator.firstName}`} onClick={onMessage}>
              <MessageCircle size={20} aria-hidden />
            </RoundIconButton>
          ) : null}
          <PillButton
            variant="outline"
            size="lg"
            className={primary ? "!hidden md:!inline-flex" : "flex-1"}
            icon={<MessageCircle size={18} aria-hidden />}
            onClick={onMessage}
          >
            Message
          </PillButton>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Track record and fit */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <TrustLine creator={creator} />
            </div>
            <button
              type="button"
              onClick={() => setShowFit((v) => !v)}
              aria-expanded={showFit}
              aria-controls={fitId}
              className="flex flex-none items-center gap-1 rounded-full bg-(--y-lavender) px-3 py-1.5 text-(--y-on-color) transition-transform active:scale-95"
            >
              <span className="y-display y-num text-[17px] leading-none font-semibold">{fit.score}%</span>
              <span className="y-micro">fit</span>
              <ChevronDown size={14} aria-hidden className={showFit ? "rotate-180" : ""} />
              <span className="sr-only">. {showFit ? "Hide" : "Show"} why</span>
            </button>
          </div>
          {showFit ? (
            <div id={fitId} data-tone="lavender" className="y-block flex flex-col gap-3 !rounded-(--y-r-tile) p-4">
              <p className="y-small font-semibold">Why {fit.score}% fit</p>
              <MatchExplain reasons={fit.reasons} gaps={fit.gaps} />
            </div>
          ) : (
            <span id={fitId} hidden />
          )}
        </div>

        {/* The idea */}
        <div className="flex flex-col gap-3">
          <p dir="auto" className="y-display text-[22px] leading-snug">
            &ldquo;{pitch.angle}&rdquo;
          </p>
          <p dir="auto" className="y-body y-fg-2 whitespace-pre-line">
            {pitch.message}
          </p>
        </div>

        {/* Terms */}
        <dl className="grid grid-cols-2 gap-4 border-y border-(--b-line) py-4">
          <div className="flex flex-col gap-0.5">
            <dt className="y-micro y-fg-2">Quote</dt>
            <dd className="y-display y-num text-[26px] leading-tight font-semibold tracking-[-0.02em]">{money(pitch.price)}</dd>
            <dd className={`y-micro ${budget.over ? "font-semibold text-(--y-warning)" : "y-fg-2"}`}>{budget.text}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="y-micro y-fg-2">First version</dt>
            <dd className="y-display y-num text-[26px] leading-tight font-semibold tracking-[-0.02em]">
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
            <ul className="grid grid-cols-3 gap-2">
              {samples.slice(0, 3).map((video) => (
                <li key={video.id} className="min-w-0">
                  <button
                    type="button"
                    className="group block w-full rounded-(--y-r-tile) text-start"
                    onClick={() => onSample(video.id)}
                    aria-label={`Play sample: ${video.title}`}
                  >
                    <VideoThumb video={video} frame="9:16" playable showHook={false} decorative />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <PillButton href={paths.creator(creator.handle)} variant="ghost" size="sm" className="-ms-3">
            View profile
          </PillButton>
          {!hired && !declined ? (
            <PillButton
              variant="ghost"
              size="sm"
              className="ms-auto"
              icon={<X size={16} aria-hidden />}
              onClick={onDecline}
              aria-label={`Decline ${creator.firstName}'s pitch`}
            >
              Decline
            </PillButton>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}
