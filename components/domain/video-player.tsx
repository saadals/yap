"use client";

import { Captions, Languages, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { clock } from "@/lib/format";
import { isArabic } from "@/lib/taxonomy";
import type { Beat, DeliveryComment, Video } from "@/lib/types";

import { VideoThumb } from "./video-thumb";

const beatLabel: Record<Beat, string> = {
  hook: "Hook",
  problem: "Problem",
  demo: "Demo",
  proof: "Proof",
  cta: "Call to action",
};

/**
 * Simulated player (no media files): plays the video's script against a clock, with captions in
 * the video's language, an English translation, a seekable timeline and markers for notes.
 */
export function VideoPlayer({
  video,
  comments = [],
  onTime,
  seek,
  activeCommentId,
  onMarkerClick,
  className = "",
  size = "md",
}: {
  video: Video;
  comments?: DeliveryComment[];
  /** Called when the playhead enters a new whole second (including seeks). */
  onTime?: (seconds: number) => void;
  /** Seek from outside (e.g. clicking a note); change `key` to re-trigger the same time. */
  seek?: { at: number; key: number };
  activeCommentId?: string;
  onMarkerClick?: (comment: DeliveryComment) => void;
  className?: string;
  /** Vertical videos: sm 260px, md 340px, lg 400px wide. */
  size?: "sm" | "md" | "lg";
}) {
  const duration = video.durationSec;
  // Playback clock: `base` seconds at the last pause/seek, plus elapsed time while playing.
  const [base, setBase] = useState(0);
  const [playStart, setPlayStart] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [started, setStarted] = useState(false);
  const [translate, setTranslate] = useState(true);
  const [captions, setCaptions] = useState(true);
  const [seenSeek, setSeenSeek] = useState<number | undefined>(undefined);
  const onTimeRef = useRef(onTime);
  const arabic = isArabic(video.lang);
  const wide = video.aspect === "16:9";
  const playing = playStart !== null;
  const t = playing ? Math.min(duration, base + Math.max(0, now - playStart) / 1000) : base;

  // External seek (e.g. clicking a note): adjust state while rendering, React's derived-state pattern.
  if (seek && seek.key !== seenSeek) {
    setSeenSeek(seek.key);
    setBase(Math.max(0, Math.min(duration, seek.at)));
    setPlayStart(null);
    setStarted(true);
  }

  useEffect(() => {
    onTimeRef.current = onTime;
  }, [onTime]);

  const second = Math.floor(t);
  useEffect(() => {
    onTimeRef.current?.(second);
  }, [second]);

  useEffect(() => {
    if (playStart === null) return;
    let frame = 0;
    const tick = (stamp: number) => {
      if (base + (stamp - playStart) / 1000 >= duration) {
        setBase(duration);
        setPlayStart(null);
        return;
      }
      setNow(stamp);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playStart, base, duration]);

  const toggle = () => {
    setStarted(true);
    if (playing) {
      setBase(t);
      setPlayStart(null);
      return;
    }
    const from = t >= duration ? 0 : t;
    const stamp = performance.now();
    setBase(from);
    setNow(stamp);
    setPlayStart(stamp);
  };

  const seekTo = (value: number) => {
    const next = Math.max(0, Math.min(duration, value));
    setStarted(true);
    setBase(next);
    if (playing) {
      const stamp = performance.now();
      setNow(stamp);
      setPlayStart(stamp);
    }
  };

  const line = [...video.script].reverse().find((l) => l.at <= t) ?? video.script[0];
  const widthClass = wide ? "w-full" : { sm: "max-w-[260px]", md: "max-w-[340px]", lg: "max-w-[400px]" }[size];

  return (
    <div className={`flex w-full flex-col gap-3 ${className}`}>
      <div className={`relative mx-auto w-full ${widthClass}`}>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause video" : t >= duration ? "Replay video" : "Play video"}
          className="block w-full rounded-(--y-r-tile) text-start"
        >
          <VideoThumb
            video={video}
            showHook={!started}
            showMeta={!started}
            playable={!playing}
            decorative
          />
        </button>

        {started ? (
          <>
            <span className="pointer-events-none absolute end-3 top-3 z-[3] rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {beatLabel[line.beat]}
            </span>
            {captions ? (
              <div
                className="pointer-events-none absolute inset-x-3 bottom-4 z-[3] flex flex-col items-center gap-1.5 text-center"
                aria-live="polite"
              >
                <span
                  dir={arabic ? "rtl" : "ltr"}
                  lang={arabic ? "ar" : "en"}
                  className={`y-thumb-caption text-[15px] md:text-[17px] ${arabic ? "y-display" : ""}`}
                >
                  {line.text}
                </span>
                {arabic && translate && line.translation ? (
                  <span className="rounded-lg bg-black/65 px-2 py-0.5 text-[12px] font-medium text-white">
                    {line.translation}
                  </span>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Controls */}
      <div className={`mx-auto flex w-full items-center gap-2 ${widthClass}`}>
        <button
          type="button"
          onClick={toggle}
          className="y-round"
          data-tone-btn="contrast"
          data-size="sm"
          aria-label={playing ? "Pause" : t >= duration ? "Replay" : "Play"}
        >
          {playing ? (
            <Pause size={18} aria-hidden className="fill-current" />
          ) : t >= duration ? (
            <RotateCcw size={18} aria-hidden />
          ) : (
            <Play size={18} aria-hidden className="ms-0.5 fill-current" />
          )}
        </button>
        <span className="y-micro y-num y-fg-2 w-[72px] flex-none text-center">
          {clock(t)} / {clock(duration)}
        </span>
        <div className="relative flex h-10 flex-1 items-center">
          <div
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={Math.floor(t)}
            aria-valuetext={`${clock(t)} of ${clock(duration)}`}
            className="y-progress w-full cursor-pointer"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              seekTo(((event.clientX - rect.left) / rect.width) * duration);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") seekTo(t + 1);
              if (event.key === "ArrowLeft") seekTo(t - 1);
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                toggle();
              }
            }}
          >
            <span style={{ width: `${(t / duration) * 100}%` }} className="!transition-none" />
          </div>
          {comments.map((comment) => (
            <button
              key={comment.id}
              type="button"
              aria-label={`Note at ${clock(comment.atSec)}: ${comment.text}`}
              title={`${clock(comment.atSec)} · ${comment.text}`}
              onClick={() => {
                seekTo(comment.atSec);
                onMarkerClick?.(comment);
              }}
              className={`absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-(--b-bg,var(--y-paper)) transition-transform hover:scale-125 ${
                comment.resolved ? "bg-(--b-line)" : "bg-(--y-c-coral)"
              } ${activeCommentId === comment.id ? "scale-125 !bg-(--y-ink)" : ""}`}
              style={{ left: `${(comment.atSec / duration) * 100}%` }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCaptions((c) => !c)}
          aria-pressed={captions}
          className="y-round"
          data-tone-btn="soft"
          data-size="sm"
          aria-label="Captions"
          title="Captions"
        >
          <Captions size={18} aria-hidden />
        </button>
        {arabic ? (
          <button
            type="button"
            onClick={() => setTranslate((c) => !c)}
            aria-pressed={translate}
            className="y-round"
            data-tone-btn="soft"
            data-size="sm"
            aria-label="English translation"
            title="English translation"
          >
            <Languages size={18} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
