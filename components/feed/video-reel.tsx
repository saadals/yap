"use client";

import { BadgeCheck, Play } from "lucide-react";
import Link from "next/link";

import { useSimulatedPlayback } from "@/components/domain/video-player";
import { VideoThumb } from "@/components/domain/video-thumb";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { money } from "@/lib/format";
import { paths } from "@/lib/paths";
import { startingPrice } from "@/lib/selectors";
import { formatById, isArabic, languageById } from "@/lib/taxonomy";
import type { Video } from "@/lib/types";

import type { VideoItem } from "./feed-items";
import { reelHref, reelLabel } from "./feed-items";
import { ReelFrame, type ReelProps } from "./reel-frame";

/**
 * A creator's portfolio video as a full-bleed reel: the generated scene, simulated playback with
 * captions (and an English translation for Arabic) while it's the active reel, the creator, and
 * one neon pill: Order, which starts a direct order with this video as the reference.
 */
export function VideoReel({
  item,
  active,
  since,
  reducedMotion,
  onOpen,
  position,
  setSize,
}: ReelProps<VideoItem>) {
  const { video, creator } = item;
  const href = reelHref(item);
  const meta = [
    formatById[video.format]?.name,
    languageById[video.lang]?.short,
    `From ${money(startingPrice(creator))}`,
  ]
    .filter(Boolean)
    .join(" · ");

  // Built here so the playback layer (which re-renders every frame) reuses the same element.
  const info = (
    <div className="flex flex-col gap-3">
      <div className="y-reel-shadow flex items-center gap-3 text-white">
        <span className="flex-none rounded-full ring-2 ring-white">
          <FaceAvatar id={creator.id} name="" size={44} />
        </span>
        <Link
          href={paths.creator(creator.handle)}
          draggable={false}
          className="flex min-h-11 min-w-0 flex-col justify-center rounded-(--y-r-sm)"
        >
          <span className="y-body flex items-center gap-1 truncate font-semibold">
            {creator.name}
            {creator.verified ? <BadgeCheck size={16} aria-label="Verified" className="flex-none" /> : null}
          </span>
          <span className="y-small truncate font-medium">@{creator.handle}</span>
        </Link>
      </div>
      <p className="y-reel-shadow y-small font-semibold text-white">{meta}</p>
      <PillButton
        href={href}
        variant="neon"
        size="lg"
        arrow
        className="w-full"
        aria-label={`Order from ${creator.name}`}
      >
        Order
      </PillButton>
    </div>
  );

  return (
    <ReelFrame
      kind="video"
      label={reelLabel(item)}
      href={href}
      action="Order"
      reducedMotion={reducedMotion}
      onOpen={onOpen}
      position={position}
      setSize={setSize}
    >
      <div className="absolute inset-0">
        <VideoThumb video={video} frame="9:16" fill rounded={false} showHook={false} showMeta={false} decorative />
      </div>
      <span aria-hidden className="y-reel-scrim" />
      <ReelPlayback
        video={video}
        autoplay={{ active: active && since !== null, since: since ?? 0, play: !reducedMotion }}
        info={info}
      />
    </ReelFrame>
  );
}

/**
 * The part of a video reel that changes while it plays: the tap-to-pause surface, the caption at
 * the playhead (with its translation) and a thin progress line. `info` is passed in as an element
 * so the static overlay isn't re-rendered on every frame.
 */
function ReelPlayback({
  video,
  autoplay,
  info,
}: {
  video: Video;
  autoplay: { active: boolean; since: number; play: boolean };
  info: React.ReactNode;
}) {
  const { t, duration, playing, started, line, toggle } = useSimulatedPlayback(video, {
    autoplay,
    loop: true,
  });
  const arabic = isArabic(video.lang);
  const text = started ? line.text : video.hook;
  const translation = started ? line.translation : video.hookTranslation;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${video.title}` : `Play ${video.title}`}
        className="absolute inset-0 z-[2] cursor-pointer rounded-(--y-r-block) focus-visible:outline-offset-[-6px]"
      >
        {playing ? null : (
          <span
            aria-hidden
            className="y-play absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: 72, height: 72 }}
          >
            <Play size={30} className="ms-1 fill-current" />
          </span>
        )}
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] flex flex-col gap-3 p-4">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span
            dir={arabic ? "rtl" : "ltr"}
            lang={arabic ? "ar" : "en"}
            className={`y-thumb-caption ${arabic ? "y-display" : ""}`}
            style={{ fontSize: "clamp(15px, 4.6cqw, 19px)" }}
          >
            {text}
          </span>
          {arabic && translation ? (
            <span className="rounded-lg bg-black/70 px-2 py-0.5 text-[13px] font-medium text-white">
              {translation}
            </span>
          ) : null}
        </div>
        <span aria-hidden className="block h-[3px] overflow-hidden rounded-full bg-white/30">
          <span className="block h-full rounded-full bg-white" style={{ width: `${(t / duration) * 100}%` }} />
        </span>
        <div className="pointer-events-auto">{info}</div>
      </div>
    </>
  );
}
