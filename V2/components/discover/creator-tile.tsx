"use client";

import { BadgeCheck, Star } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { SaveCreatorButton } from "@/components/domain/creator-card";
import { useSimulatedPlayback } from "@/components/domain/video-player";
import { VideoThumb } from "@/components/domain/video-thumb";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { money } from "@/lib/format";
import { useReducedMotion } from "@/lib/hooks";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { cityById, featuredVideo, me } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { creatorKindById, languageById, textDir } from "@/lib/taxonomy";
import type { Creator, Video } from "@/lib/types";

import { fromPrice } from "./filters";

/** Hover (or keyboard focus) this long before the cover starts previewing. */
const PREVIEW_DELAY = 420;

/**
 * A creator in a grid: a vertical cover from their featured video, the save heart, then name and
 * rating, one meta line, and the starting price. The whole card links to the profile.
 *
 * Hovering the cover with a mouse (or focusing the card) for a moment previews the video: its
 * captions play over the cover. Only the card under the pointer plays, never on touch, and not
 * with reduced motion. `reason` replaces the meta line (e.g. why it fits your product).
 */
export function CreatorTile({
  creator,
  reason,
  className = "",
}: {
  creator: Creator;
  reason?: string;
  className?: string;
}) {
  const s = useDemo();
  const { account } = usePrefs();
  const reducedMotion = useReducedMotion();
  const video = featuredVideo(s, creator);
  const own = Boolean(account) && me.creator(s)?.id === creator.id;
  const [since, setSince] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const start = () => {
    if (!video || reducedMotion) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSince(performance.now()), PREVIEW_DELAY);
  };
  const stop = () => {
    window.clearTimeout(timer.current);
    setSince(null);
  };

  const city = cityById(creator.cityId);
  const languages = creator.languages.map((id) => languageById[id].name).join(", ");
  const meta = reason ?? [city?.name, languages].filter(Boolean).join(" · ");
  const from = fromPrice(creator);
  const previewing = since !== null && video;

  return (
    <article
      data-tone="paper"
      className={`y-block y-hoverable group relative flex flex-col overflow-hidden ${className}`}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") start();
      }}
      onPointerLeave={stop}
      onFocus={start}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) stop();
      }}
    >
      <div className="relative p-1.5 pb-0">
        <div className="relative aspect-[3/4] overflow-hidden rounded-(--y-r-tile) [container-type:inline-size]">
          {video ? (
            <VideoThumb
              video={video}
              frame="9:16"
              fill
              hookAt="bottom"
              showHook={!previewing}
              showMeta={!previewing}
              showViews={false}
              decorative
            />
          ) : (
            <NoVideoCover creator={creator} />
          )}
          {previewing ? <CoverPreview video={video} since={since} /> : null}
        </div>
        <div className="absolute inset-x-3.5 top-3.5 z-[4] flex items-start justify-between gap-2">
          {own ? (
            <CoverTag>Your profile</CoverTag>
          ) : !creator.available ? (
            <CoverTag>Booked</CoverTag>
          ) : (
            <span />
          )}
          <SaveCreatorButton creator={creator} className="relative z-[4]" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 px-3.5 pt-2.5 pb-3.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="y-head flex min-w-0 items-center gap-1">
            <Link
              href={paths.creator(creator.handle)}
              className="truncate after:absolute after:inset-0 after:z-[2] after:content-[''] focus-visible:outline-none"
            >
              {creator.name}
            </Link>
            {creator.verified ? <BadgeCheck size={15} aria-label="ID verified" className="flex-none" /> : null}
          </h3>
          <TileRating creator={creator} className="max-sm:hidden" />
        </div>
        {/* Phones (two narrow columns): the rating moves into the meta line, which keeps to languages. */}
        <p className="y-small y-fg-2 flex min-w-0 items-center gap-1 sm:hidden">
          <TileRating creator={creator} className="text-(--b-fg)" />
          <span aria-hidden>·</span>
          <span className="truncate">{reason ?? languages}</span>
        </p>
        <p className="y-small y-fg-2 truncate max-sm:hidden">{meta}</p>
        <p className="y-small mt-1 truncate">
          {Number.isFinite(from) ? <span className="font-semibold">From {money(from)}</span> : null}
          <span className="y-fg-2 max-sm:hidden">
            {Number.isFinite(from) ? " · " : ""}
            {creatorKindById[creator.kind].name}
          </span>
        </p>
      </div>
    </article>
  );
}

function CoverTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#0e0e10]/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
      {children}
    </span>
  );
}

/** ★ 4.9, or "New" for a creator with no ratings yet. */
export function TileRating({ creator, className = "" }: { creator: Creator; className?: string }) {
  if (!creator.reviewCount && !creator.rating)
    return <span className={`y-small y-fg-2 flex-none font-medium ${className}`}>New</span>;
  return (
    <span
      className={`y-small inline-flex flex-none items-center gap-1 font-semibold ${className}`}
      aria-label={`Rated ${creator.rating.toFixed(1)} out of 5`}
    >
      <Star size={14} aria-hidden className="fill-current" />
      <span aria-hidden className="y-num">
        {creator.rating.toFixed(1)}
      </span>
    </span>
  );
}

/** A profile with no videos yet: their face on their own tints. */
function NoVideoCover({ creator }: { creator: Creator }) {
  return (
    <div className="grid h-full w-full place-items-center bg-(--y-mist)">
      <span className="flex w-1/2 flex-col items-center gap-3">
        <FaceAvatar id={creator.id} name="" size="100%" />
        <span className="y-micro y-fg-2 text-center font-medium">No videos yet</span>
      </span>
    </div>
  );
}

/** The cover's preview: the caption at the playhead and a thin progress line. */
function CoverPreview({ video, since }: { video: Video; since: number }) {
  const { t, duration, line } = useSimulatedPlayback(video, {
    autoplay: { active: true, since },
    loop: true,
  });
  const rtl = textDir(video.lang) === "rtl";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[3]">
      <div
        className={`absolute inset-x-[7%] bottom-[12%] ${rtl ? "text-right" : "text-left"}`}
        dir={textDir(video.lang)}
        lang={video.lang}
        style={{ fontSize: "clamp(11px, 6.2cqw, 18px)" }}
      >
        <span className={`y-thumb-caption ${rtl ? "y-display" : ""}`}>{line.text}</span>
      </div>
      <span className="absolute inset-x-3 bottom-3 h-[3px] overflow-hidden rounded-full bg-white/35">
        <span className="block h-full rounded-full bg-white" style={{ width: `${(t / duration) * 100}%` }} />
      </span>
    </div>
  );
}

export function CreatorTileSkeleton() {
  return (
    <div data-tone="paper" className="y-block flex flex-col overflow-hidden" aria-hidden>
      <div className="p-1.5 pb-0">
        <Skeleton className="aspect-[3/4] w-full !rounded-(--y-r-tile)" />
      </div>
      <div className="flex flex-col gap-2 px-3.5 pt-3 pb-4">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  );
}

/** The grid every creator list uses (Discover, saved, similar creators). */
export const tileGrid = "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
