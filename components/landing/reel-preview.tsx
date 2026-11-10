"use client";

import { useEffect, useState } from "react";

import { useSimulatedPlayback } from "@/components/domain/video-player";
import { VideoThumb } from "@/components/domain/video-thumb";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { isTranslated, nicheById, textDir } from "@/lib/taxonomy";
import type { Creator, Video } from "@/lib/types";

/** How long each of the creator's two videos plays before the next one. */
const CLIP_MS = 5000;

/**
 * A creator's highlight reel over the bubbles: their two best videos, in turn, with Stories-style
 * segments. It never blocks the mouse (hover has to reach the bubbles underneath); on touch,
 * tapping it closes it.
 */
export function ReelPreview({
  creator,
  videos,
  open,
  openedAt,
  tap,
  hint,
  reduced,
  onClose,
}: {
  creator: Creator;
  videos: Video[];
  open: boolean;
  /** `performance.now()` when it opened. */
  openedAt: number;
  tap: boolean;
  /** Shows "Tap to close" (the first preview only). */
  hint: boolean;
  reduced: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="y-reelprev"
      data-open={open}
      data-tap={tap}
      role="group"
      aria-label={`Highlights from ${creator.name}`}
    >
      {/* Keyed so switching creators swaps the content without closing the frame. */}
      <Clips key={creator.id} creator={creator} videos={videos} openedAt={openedAt} reduced={reduced} />
      {hint ? <span className="y-reelprev-hint">Tap to close</span> : null}
      {tap ? (
        <button
          type="button"
          aria-label="Close preview"
          className="absolute inset-0 z-[3] cursor-pointer"
          onClick={onClose}
        />
      ) : null}
    </div>
  );
}

function Clips({
  creator,
  videos,
  openedAt,
  reduced,
}: {
  creator: Creator;
  videos: Video[];
  openedAt: number;
  reduced: boolean;
}) {
  const [played, setPlayed] = useState(0);
  const count = videos.length;

  useEffect(() => {
    if (count < 2 && reduced) return;
    const timer = window.setInterval(() => setPlayed((n) => n + 1), CLIP_MS);
    return () => window.clearInterval(timer);
  }, [count, reduced]);

  const index = count ? played % count : 0;
  const video = videos[index];
  if (!video) return null;
  const niche = nicheById[creator.niches[0]]?.name;

  return (
    <>
      <div className="absolute inset-0">
        <VideoThumb
          key={video.id}
          video={video}
          frame="9:16"
          fill
          rounded={false}
          showHook={false}
          showMeta={false}
          decorative
        />
      </div>

      <div className="y-reelprev-bars" aria-hidden>
        {videos.map((clip, position) => (
          <span key={clip.id}>
            <i
              key={position === index ? played : "rest"}
              data-state={position === index ? "active" : position < index ? "done" : "idle"}
              style={{ animationDuration: `${CLIP_MS}ms` }}
            />
          </span>
        ))}
      </div>

      <div className="y-reelprev-meta">
        <Caption key={played} video={video} since={openedAt + played * CLIP_MS} reduced={reduced} />
        <div className="flex items-center gap-2.5">
          <span className="flex-none rounded-full ring-2 ring-white/90">
            <FaceAvatar id={creator.id} name="" size={36} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] leading-tight font-semibold">{creator.name}</span>
            <span className="truncate text-xs opacity-80">@{creator.handle}</span>
          </span>
        </div>
        {niche ? <span className="y-reelprev-tag">{niche}</span> : null}
      </div>
    </>
  );
}

/** The line at the playhead, on its own so only this re-renders while the clip plays. */
function Caption({ video, since, reduced }: { video: Video; since: number; reduced: boolean }) {
  const { line, started } = useSimulatedPlayback(video, {
    autoplay: { active: true, since, play: !reduced },
    loop: true,
  });
  const translated = isTranslated(video.lang);
  const text = started ? line.text : video.hook;
  const translation = started ? line.translation : video.hookTranslation;
  if (!text) return null;
  return (
    <div className="mb-3 flex flex-col items-center gap-1.5 text-center">
      <span
        dir={textDir(video.lang)}
        lang={video.lang}
        className={`y-thumb-caption ${textDir(video.lang) === "rtl" ? "y-display" : ""}`}
        style={{ fontSize: "clamp(14px, 1.9vh, 17px)" }}
      >
        {text}
      </span>
      {translated && translation ? (
        <span className="rounded-lg bg-black/70 px-2 py-0.5 text-xs font-medium text-white">{translation}</span>
      ) : null}
    </div>
  );
}
