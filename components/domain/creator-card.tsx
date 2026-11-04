"use client";

import { BadgeCheck, Heart, Megaphone, Zap } from "lucide-react";
import Link from "next/link";

import { FaceAvatar } from "@/components/ui/face-avatar";
import { useToast } from "@/components/ui/toast";
import { compact, money } from "@/lib/format";
import { cityById, featuredVideo, isSaved, startingPrice } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { creatorKindById, languageById } from "@/lib/taxonomy";
import type { Creator } from "@/lib/types";

import { Rating } from "./stars";
import { VideoThumb } from "./video-thumb";

/** Save/unsave a creator (heart). Works anywhere; shows an undo toast. */
export function SaveCreatorButton({
  creator,
  className = "",
  variant = "overlay",
}: {
  creator: Creator;
  className?: string;
  variant?: "overlay" | "soft";
}) {
  const s = useDemo();
  const toast = useToast();
  const saved = isSaved(s, creator.id);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${creator.name} from saved` : `Save ${creator.name}`}
      title={saved ? "Saved" : "Save"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const nowSaved = actions.toggleSavedCreator(creator.id);
        toast({
          message: nowSaved ? `Saved ${creator.firstName}` : `Removed ${creator.firstName} from saved`,
          action: { label: "Undo", onClick: () => actions.toggleSavedCreator(creator.id) },
        });
      }}
      className={
        variant === "overlay"
          ? `grid size-11 place-items-center rounded-full bg-white/90 text-[#0e0e10] shadow-[0_4px_12px_-4px_rgb(14_14_16/0.4)] backdrop-blur-sm transition-transform hover:scale-105 active:scale-95 ${className}`
          : `y-round ${className}`
      }
      data-tone-btn={variant === "soft" ? "soft" : undefined}
      data-size={variant === "soft" ? "sm" : undefined}
    >
      <Heart size={20} aria-hidden className={saved ? "fill-[#ff5a5f] text-[#ff5a5f]" : ""} />
    </button>
  );
}

/**
 * Browse card: featured video up top (Airbnb-style), then who they are, trust and price.
 * The whole card links to the profile; the heart is a separate control.
 */
export function CreatorCard({ creator, className = "" }: { creator: Creator; className?: string }) {
  const s = useDemo();
  const video = featuredVideo(s, creator);
  const city = cityById(creator.cityId);
  const kind = creatorKindById[creator.kind];

  return (
    <article
      data-tone="paper"
      className={`y-block y-hoverable group relative flex flex-col overflow-hidden ${className}`}
    >
      <div className="relative p-2 pb-0">
        {video ? <VideoThumb video={video} frame="4:5" hookAt="bottom" decorative /> : <div className="aspect-[4/5] rounded-(--y-r-tile) bg-(--y-mist)" />}
        <div className="absolute inset-x-4 top-4 z-[3] flex items-start justify-between gap-2">
          <span className="flex flex-wrap gap-1.5">
            {creator.topRated ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#0e0e10]">
                <Zap size={12} aria-hidden className="fill-current" /> Top rated
              </span>
            ) : null}
            {creator.kind === "influencer" && creator.followers ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0e0e10] px-2.5 py-1 text-xs font-semibold text-white">
                <Megaphone size={12} aria-hidden /> {compact(creator.followers)}
              </span>
            ) : null}
          </span>
          <SaveCreatorButton creator={creator} className="relative z-[4]" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 pt-3">
        <div className="flex items-start gap-3">
          <FaceAvatar id={creator.id} name="" size={40} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <h3 className="y-head flex items-center gap-1.5">
              <Link
                href={`/creators/${creator.handle}`}
                className="truncate after:absolute after:inset-0 after:z-[2] after:content-['']"
              >
                {creator.name}
              </Link>
              {creator.verified ? (
                <BadgeCheck size={17} aria-label="ID verified" className="flex-none" />
              ) : null}
            </h3>
            <p className="y-small y-fg-2 truncate">
              {kind.name} · {city?.name}
            </p>
          </div>
          <Rating value={creator.rating} count={creator.reviewCount} />
        </div>
        <p className="y-small y-clamp-2 y-fg-2">{creator.headline}</p>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-(--b-line) pt-3">
          <span className="y-micro y-fg-2 flex flex-wrap gap-x-2">
            {creator.languages.slice(0, 3).map((id) => (
              <span key={id}>{languageById[id].short}</span>
            ))}
          </span>
          <span className="y-small flex-none">
            <span className="y-fg-2">From </span>
            <span className="y-display y-num text-[22px] font-semibold tracking-[-0.02em]">
              {money(startingPrice(creator))}
            </span>
          </span>
        </div>
        {!creator.available ? (
          <span className="y-micro y-fg-3 -mt-1">Booked right now · taking new work soon</span>
        ) : null}
      </div>
    </article>
  );
}

/** Compact one-line creator (sidebars, pickers). */
export function CreatorRow({
  creator,
  meta,
  action,
  href = `/creators/${creator.handle}`,
}: {
  creator: Creator;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  href?: string | null;
}) {
  const city = cityById(creator.cityId);
  const body = (
    <>
      <FaceAvatar id={creator.id} name="" size={44} />
      <span className="min-w-0 flex-1">
        <span className="y-small flex items-center gap-1 font-semibold">
          <span className="truncate">{creator.name}</span>
          {creator.verified ? <BadgeCheck size={14} aria-label="ID verified" className="flex-none" /> : null}
        </span>
        <span className="y-micro y-fg-2 block truncate">
          {meta ?? `${creatorKindById[creator.kind].name} · ${city?.name} · ★ ${creator.rating.toFixed(1)}`}
        </span>
      </span>
    </>
  );
  return (
    <div className="flex items-center gap-3">
      {href ? (
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 rounded-full">
          {body}
        </Link>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{body}</span>
      )}
      {action}
    </div>
  );
}
