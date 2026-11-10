"use client";

import { BadgeCheck, Play } from "lucide-react";

import { useSimulatedPlayback } from "@/components/domain/video-player";
import { VideoThumb } from "@/components/domain/video-thumb";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { money } from "@/lib/format";
import { paths } from "@/lib/paths";
import { startingPrice } from "@/lib/selectors";
import { formatById, isTranslated, languageById, textDir } from "@/lib/taxonomy";
import type { Video } from "@/lib/types";

import type { VideoItem } from "./feed-items";
import { reelLabel } from "./feed-items";
import { ReelCta, ReelFrame, ReelWho, type ReelProps } from "./reel-frame";

/**
 * A creator's portfolio video as a full-bleed reel: the generated scene, simulated playback with
 * captions (plus an English translation when the video isn't in English) while it's the active
 * reel, the creator top start, and one neon pill: Order, which opens the details layer.
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
  const meta = [
    formatById[video.format]?.name,
    languageById[video.lang]?.name,
    `From ${money(startingPrice(creator))}`,
  ]
    .filter(Boolean)
    .join(" · ");

  // Built here so the playback layer (which re-renders every frame) reuses the same element.
  const info = (
    <>
      <p className="y-reel-desc">{meta}</p>
      <ReelCta label="Order" neon onClick={() => onOpen(item.id)} ariaLabel={`Order from ${creator.name}`} />
    </>
  );

  return (
    <ReelFrame
      kind="video"
      id={item.id}
      label={reelLabel(item)}
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
      <ReelWho
        avatar={<FaceAvatar id={creator.id} name="" size={28} />}
        name={creator.name}
        badge={creator.verified ? <BadgeCheck size={14} aria-label="Verified" className="flex-none" /> : undefined}
        sub={`@${creator.handle}`}
        href={paths.creator(creator.handle)}
      />
    </ReelFrame>
  );
}

/**
 * The part of a video reel that changes while it plays: the tap-to-pause surface and the caption
 * at the playhead (with its translation). `info` is passed in as an element so the static overlay
 * isn't re-rendered on every frame.
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
  const { playing, started, line, toggle } = useSimulatedPlayback(video, {
    autoplay,
    loop: true,
  });
  const translated = isTranslated(video.lang);
  const text = started ? line.text : video.hook;
  const translation = started ? line.translation : video.hookTranslation;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${video.title}` : `Play ${video.title}`}
        className="absolute inset-0 z-[2] cursor-pointer focus-visible:outline-offset-[-6px]"
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

      <div className="y-reel-bottom">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span
            dir={textDir(video.lang)}
            lang={video.lang}
            className={`y-thumb-caption ${textDir(video.lang) === "rtl" ? "y-display" : ""}`}
            style={{ fontSize: "clamp(15px, 4.6cqw, 19px)" }}
          >
            {text}
          </span>
          {translated && translation ? (
            <span className="rounded-lg bg-black/70 px-2 py-0.5 text-[13px] font-medium text-white">
              {translation}
            </span>
          ) : null}
        </div>
        {info}
      </div>
    </>
  );
}
