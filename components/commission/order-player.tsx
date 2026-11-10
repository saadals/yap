"use client";

import { Captions, Languages, Pause, Play, RotateCcw } from "lucide-react";
import { useState } from "react";

import { useSimulatedPlayback } from "@/components/domain/video-player";
import { VideoThumb } from "@/components/domain/video-thumb";
import { clock } from "@/lib/format";
import { isTranslated, textDir } from "@/lib/taxonomy";
import type { Aspect, DeliveryComment, Video } from "@/lib/types";

const ratio: Record<Aspect, number> = { "9:16": 9 / 16, "1:1": 1, "4:5": 4 / 5, "16:9": 16 / 9 };

/**
 * The order page's player (Work spec 6.8.3): the delivered version on a dark stage with the
 * controls laid over its foot, a "Review copy" watermark for the brand until approval, and a pin on
 * the timeline for every timestamped comment (green while open, grey once resolved). Clicking the
 * timeline moves the playhead, which sets the time for the next comment; clicking a pin jumps there
 * and highlights its comment. Playback is simulated against the video's script, with captions in
 * the video's language and an English translation when it isn't in English.
 */
export function OrderPlayer({
  video,
  comments,
  seek,
  onTime,
  activeId,
  onPin,
  watermark,
}: {
  video: Video;
  /** Comments on this version (general ones and deleted ones get no pin). */
  comments: DeliveryComment[];
  seek?: { at: number; key: number };
  /** Called when the playhead enters a new whole second (seeks included). */
  onTime: (seconds: number) => void;
  activeId?: string;
  onPin: (comment: DeliveryComment) => void;
  watermark: boolean;
}) {
  const { t, duration, playing, started, line, toggle, seekTo } = useSimulatedPlayback(video, { seek, onTime });
  const [captions, setCaptions] = useState(true);
  const [translate, setTranslate] = useState(true);
  const translated = isTranslated(video.lang);
  const aspect = ratio[video.aspect];
  const wide = aspect > 1;
  const pins = comments.filter((c) => c.atSec !== null && !c.deletedAt);
  const pct = (seconds: number) => `${Math.max(0, Math.min(100, (seconds / Math.max(duration, 1)) * 100))}%`;

  return (
    <div className="y-ord-player" data-wide={wide ? "true" : undefined}>
      {/* Fits the stage: by height when it's narrower than the 4:5 stage, by width otherwise. */}
      <div className="y-ord-frame" data-wide={aspect > 0.8 ? "true" : undefined} style={{ aspectRatio: String(aspect) }}>
        <VideoThumb video={video} showHook={!started} showMeta={false} playable={!playing} rounded={false} decorative />
        {started && captions ? (
          <div className="y-ord-captions" aria-live="polite">
            <span
              dir={textDir(video.lang)}
              lang={video.lang}
              className={`y-thumb-caption text-[14px] md:text-[16px] ${textDir(video.lang) === "rtl" ? "y-display" : ""}`}
            >
              {line.text}
            </span>
            {translated && translate && line.translation ? (
              <span className="y-ord-translation">{line.translation}</span>
            ) : null}
          </div>
        ) : null}
        {/* The whole frame plays and pauses with a click; the play button is the keyboard control. */}
        <button type="button" tabIndex={-1} aria-hidden className="y-ord-frame-hit" onClick={toggle} />
      </div>

      {watermark ? (
        <div className="y-ord-wm" aria-hidden>
          <span>Review copy</span>
        </div>
      ) : null}

      <div className="y-ord-ctrl">
        <button
          type="button"
          onClick={toggle}
          className="y-ord-glass y-ord-play"
          aria-label={playing ? "Pause" : t >= duration ? "Replay" : "Play"}
        >
          {playing ? (
            <Pause size={15} aria-hidden className="fill-current" />
          ) : t >= duration ? (
            <RotateCcw size={15} aria-hidden />
          ) : (
            <Play size={15} aria-hidden className="ms-0.5 fill-current" />
          )}
        </button>
        <span className="y-ord-time y-num">
          {clock(t)} / {clock(duration)}
        </span>
        <div className="y-ord-tl-wrap">
          <div
            role="slider"
            tabIndex={0}
            aria-label="Timeline: pick the moment for your next comment"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={Math.floor(t)}
            aria-valuetext={`${clock(t)} of ${clock(duration)}`}
            className="y-ord-tl"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const x = event.clientX - rect.left;
              const share = getComputedStyle(event.currentTarget).direction === "rtl" ? 1 - x / rect.width : x / rect.width;
              seekTo(Math.round(share * duration));
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                event.preventDefault();
                seekTo(Math.floor(t) + 1);
              }
              if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault();
                seekTo(Math.floor(t) - 1);
              }
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                toggle();
              }
            }}
          >
            <span className="y-ord-tl-fill" style={{ width: pct(t) }} />
          </div>
          {pins.map((comment) => (
            <button
              key={comment.id}
              type="button"
              className="y-ord-pin"
              data-resolved={comment.resolved ? "true" : undefined}
              data-active={activeId === comment.id ? "true" : undefined}
              data-tip={`${clock(comment.atSec!)} · ${comment.text.length > 34 ? `${comment.text.slice(0, 32)}…` : comment.text}`}
              style={{ insetInlineStart: pct(comment.atSec!) }}
              aria-label={`${comment.resolved ? "Resolved comment" : "Comment"} at ${clock(comment.atSec!)}: ${comment.text}`}
              onClick={() => {
                seekTo(comment.atSec!);
                onPin(comment);
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCaptions((c) => !c)}
          aria-pressed={captions}
          className="y-ord-glass y-ord-ctl max-sm:hidden"
          aria-label="Captions"
          title="Captions"
        >
          <Captions size={15} aria-hidden />
        </button>
        {translated ? (
          <button
            type="button"
            onClick={() => setTranslate((c) => !c)}
            aria-pressed={translate}
            className="y-ord-glass y-ord-ctl"
            aria-label="English translation"
            title="English translation"
          >
            <Languages size={15} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** The dark stage with a line of text, before anything is uploaded. */
export function PlayerPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="y-ord-player" data-empty="true">
      <p className="y-ord-ph">{children}</p>
    </div>
  );
}
