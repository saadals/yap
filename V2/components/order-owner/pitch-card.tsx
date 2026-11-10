"use client";

import { AlertTriangle, BadgeCheck, PenLine, Star, Undo2, XCircle } from "lucide-react";

import { Rating } from "@/components/domain/stars";
import { PitchBadge } from "@/components/domain/status-badge";
import { VideoThumb } from "@/components/domain/video-thumb";
import { Badge } from "@/components/ui/badge";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { money, plural, quoted, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { deadlineDaysOf, isAdCopy } from "@/lib/selectors";
import type { ContentRequest, Creator, Product, Video } from "@/lib/types";

import { OverflowMenu } from "./parts";
import { deliveryInfo, fitTags, type RankedPitch } from "./shared";

/** Stars, or "New on Yapp" for a creator with no reviews yet. */
export function RatingOrNew({ creator, count = false }: { creator: Creator; count?: boolean }) {
  if (!creator.reviewCount) return <span className="y-small font-medium">New on Yapp</span>;
  return <Rating value={creator.rating} count={count ? creator.reviewCount : undefined} />;
}

/** "$300" with a warning when it's over the budget's max. */
export function PriceText({ price, request, className = "" }: { price: number; request: ContentRequest; className?: string }) {
  const over = price > request.budget.max;
  return (
    <span className={`y-num inline-flex items-center gap-1 ${over ? "text-(--y-warning)" : ""} ${className}`}>
      {over ? <AlertTriangle size={14} aria-hidden /> : null}
      {money(price)}
      {over ? <span className="sr-only"> (over your max)</span> : null}
    </span>
  );
}

/**
 * How soon the first version lands. Orders with the brand's own deadline give every pitch the same
 * days (said once, in the header), so this only speaks up when a booked creator starts later:
 * "starts Thu, Nov 12". Older orders show the pitch's days, with a warning past the due date.
 */
export function DaysText({ item, request, className = "" }: { item: RankedPitch; request: ContentRequest; className?: string }) {
  const info = deliveryInfo(item.pitch.deliveryDays, request, item.creator);
  if (deadlineDaysOf(request)) {
    if (!info.startsOn || item.pitch.status === "hired") return null;
    return <span className={`y-num ${className}`}>starts {weekdayDate(info.startsOn)}</span>;
  }
  const late = request.status === "open" && item.pitch.status !== "hired" && info.late;
  return (
    <span className={`y-num inline-flex items-center gap-1 ${late ? "text-(--y-warning)" : ""} ${className}`}>
      {late ? <AlertTriangle size={14} aria-hidden /> : null}
      {plural(item.pitch.deliveryDays, "day")}
      {late ? <span className="sr-only"> (after your due date)</span> : null}
    </span>
  );
}

/** Whether DaysText has anything to say (so the separator before it can go too). */
export function hasDaysText(item: RankedPitch, request: ContentRequest): boolean {
  if (!deadlineDaysOf(request)) return true;
  return item.pitch.status !== "hired" && Boolean(deliveryInfo(item.pitch.deliveryDays, request, item.creator).startsOn);
}

/** "98% fit · English, App demo, Fintech" */
export function fitLine(item: RankedPitch, request: ContentRequest, product?: Product) {
  const tags = fitTags(item.creator, request, product);
  return `${item.fit.score}% fit${tags.length ? ` · ${tags.join(", ")}` : ""}`;
}

/**
 * One pitch on the shortlist board: the sample video (plays), the creator, the hook idea as the
 * headline, fit in one line, the listed price (and days on older orders), and the decision
 * controls. The card opens the full pitch; the thumbnail plays the sample; star, ⋯ and Hire act on
 * their own. An ad-copy pitch without a portfolio video is a written pitch: no video tile, the
 * sample line as the headline and the start of the message under it.
 */
export function PitchCard({
  item,
  request,
  product,
  sample,
  isNew,
  canHire,
  commissionId,
  onOpen,
  onPlay,
  onShortlist,
  onDecline,
  onRestore,
  onHire,
}: {
  item: RankedPitch;
  request: ContentRequest;
  product?: Product;
  sample?: Video;
  isNew: boolean;
  canHire: boolean;
  /** The job, once this pitch is hired. */
  commissionId?: string;
  onOpen: () => void;
  onPlay: (videoId: string) => void;
  onShortlist: (on: boolean) => void;
  onDecline: () => void;
  onRestore: () => void;
  onHire: () => void;
}) {
  const { pitch, creator } = item;
  const shortlisted = pitch.status === "shortlisted";
  const declined = pitch.status === "declined";
  const hired = pitch.status === "hired";
  const written = !sample && isAdCopy(request);
  const newTag =
    isNew && !declined && !hired ? (
      <span className="rounded-full bg-[#0e0e10]/80 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
        New<span className="sr-only"> pitch, not opened yet</span>
      </span>
    ) : null;

  return (
    <article
      data-tone="paper"
      aria-label={`${creator.name}'s pitch`}
      className={`y-block y-hoverable relative flex gap-3.5 p-3 ${written ? "ps-4" : ""} ${declined ? "opacity-75" : ""}`}
    >
      {written ? null : (
        <div className="relative w-[96px] flex-none self-start sm:w-[104px]">
          {sample ? (
            <button
              type="button"
              onClick={() => onPlay(sample.id)}
              aria-label={`Play ${creator.firstName}'s sample: ${sample.title}`}
              className="relative z-[2] block w-full rounded-(--y-r-tile)"
            >
              <VideoThumb video={sample} frame="9:16" playable showHook={false} showMeta={false} decorative />
            </button>
          ) : (
            <span aria-hidden className="grid aspect-[9/16] w-full place-items-center rounded-(--y-r-tile) bg-(--b-chip)">
              <FaceAvatar id={creator.id} name="" size={44} />
            </span>
          )}
          {newTag ? <span className="pointer-events-none absolute start-1.5 top-1.5 z-[3]">{newTag}</span> : null}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
        <div className="flex items-start gap-2">
          {written ? <FaceAvatar id={creator.id} name="" size={36} className="flex-none" /> : null}
          <div className="min-w-0 flex-1">
            <p className="y-small flex items-center gap-1 font-semibold">
              <span className="truncate">{creator.name}</span>
              {creator.verified ? <BadgeCheck size={14} aria-label="ID verified" className="flex-none" /> : null}
            </p>
            <p className="y-micro y-fg-2 flex flex-wrap items-center gap-x-1.5">
              <RatingOrNew creator={creator} />
              <span aria-hidden>·</span>
              <span>{creator.onTimeRate}% on time</span>
            </p>
          </div>
          {hired ? (
            <PitchBadge status="hired" className="relative z-[2] flex-none" />
          ) : declined ? (
            <Badge tone="danger" icon={<XCircle size={14} aria-hidden />} className="relative z-[2] flex-none">
              Declined
            </Badge>
          ) : !canHire ? null : (
            <RoundIconButton
              size="sm"
              tone={shortlisted ? "contrast" : "soft"}
              className={`relative z-[2] -me-1 -mt-1 flex-none ${shortlisted ? "" : "!bg-transparent"}`}
              label={shortlisted ? `Remove ${creator.firstName} from your shortlist` : `Shortlist ${creator.firstName}`}
              aria-pressed={shortlisted}
              onClick={() => onShortlist(!shortlisted)}
            >
              <Star size={17} aria-hidden className={shortlisted ? "fill-current" : ""} />
            </RoundIconButton>
          )}
        </div>

        {written ? (
          <p className="y-micro y-fg-2 -mb-1.5 inline-flex items-center gap-1.5 font-medium">
            <PenLine size={13} aria-hidden /> Sample line
            {newTag}
          </p>
        ) : null}
        <h3 className="y-head font-semibold" dir="auto">
          <button
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            className="line-clamp-3 text-start outline-none after:absolute after:inset-0 after:z-[1] after:rounded-(--y-r-block) after:content-[''] focus-visible:after:shadow-[inset_0_0_0_2px_var(--b-fg)]"
          >
            {quoted(pitch.angle)}
          </button>
        </h3>
        {written ? (
          <p className="y-small y-fg-2 line-clamp-2" dir="auto">
            {pitch.message}
          </p>
        ) : null}

        <p className="y-micro y-fg-2 truncate">{fitLine(item, request, product)}</p>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <p className="y-small min-w-0 flex-1">
            <PriceText price={pitch.price} request={request} className="font-semibold" />
            {hasDaysText(item, request) ? (
              <>
                <span className="y-fg-2"> · </span>
                <DaysText item={item} request={request} className="y-fg-2" />
              </>
            ) : null}
          </p>
          <span className="relative z-[2] flex flex-none items-center gap-1">
            {hired ? (
              commissionId ? (
                <PillButton href={paths.job(commissionId)} size="sm" variant="outline">
                  Open job
                </PillButton>
              ) : null
            ) : declined ? (
              canHire ? (
                <PillButton size="sm" variant="ghost" icon={<Undo2 size={15} aria-hidden />} onClick={onRestore}>
                  Reconsider
                </PillButton>
              ) : null
            ) : (
              <>
                <OverflowMenu
                  label={`More for ${creator.firstName}'s pitch`}
                  tone="ghost"
                  items={[
                    { label: "Read the full pitch", onSelect: onOpen },
                    { label: "View profile", href: paths.creator(creator.handle) },
                    { label: "Decline pitch", icon: <XCircle size={16} aria-hidden />, onSelect: onDecline },
                  ]}
                />
                {canHire ? (
                  <PillButton size="sm" variant="outline" onClick={onHire} aria-label={`Hire ${creator.firstName}`}>
                    Hire
                  </PillButton>
                ) : null}
              </>
            )}
          </span>
        </div>
      </div>
    </article>
  );
}
