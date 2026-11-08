import { Mic, Play } from "lucide-react";

import { FaceAvatar } from "@/components/ui/face-avatar";
import { clock, compact } from "@/lib/format";
import { formatById, isArabic } from "@/lib/taxonomy";
import type { Aspect, Tint, Video } from "@/lib/types";

const tintVar: Record<Tint, string> = {
  violet: "var(--y-c-violet)",
  sun: "var(--y-c-sun)",
  sea: "var(--y-c-sea)",
  coral: "var(--y-c-coral)",
  mint: "var(--y-c-mint)",
  blush: "var(--y-c-blush)",
};

const ratio: Record<Aspect, number> = { "9:16": 9 / 16, "4:5": 4 / 5, "1:1": 1, "16:9": 16 / 9 };

/** Mock app screen (rows + a primary button) used inside phones and laptops. */
function Screen({ accent, dense = false }: { accent: string; dense?: boolean }) {
  return (
    <div className="absolute inset-[6%] flex flex-col gap-[6%] overflow-hidden rounded-[10%/6%] bg-white p-[8%]">
      <div className="flex items-center gap-[6%]">
        <span className="aspect-square w-[18%] rounded-full" style={{ background: accent }} />
        <span className="h-[0.5em] flex-1 rounded-full bg-[#0e0e10]/80" />
      </div>
      {Array.from({ length: dense ? 5 : 3 }, (_, i) => (
        <div key={i} className="flex items-center gap-[6%] rounded-[12%/30%] bg-[#0e0e10]/[0.06] p-[6%]">
          <span className="aspect-square w-[16%] rounded-[30%] bg-[#0e0e10]/15" />
          <span className="flex flex-1 flex-col gap-[0.25em]">
            <span className="h-[0.35em] w-[80%] rounded-full bg-[#0e0e10]/40" />
            <span className="h-[0.35em] w-[50%] rounded-full bg-[#0e0e10]/20" />
          </span>
        </div>
      ))}
      <span className="mt-auto h-[1.6em] rounded-full" style={{ background: "#34f06c" }} />
    </div>
  );
}

function Phone({
  className = "",
  style,
  accent,
  dense,
}: {
  className?: string;
  style?: React.CSSProperties;
  accent: string;
  dense?: boolean;
}) {
  return (
    <div
      className={`absolute aspect-[9/19] rounded-[18%/8.5%] bg-[#0e0e10] shadow-[0_8px_24px_-8px_rgb(14_14_16/0.5)] ${className}`}
      style={{ fontSize: "1.6cqw", ...style }}
    >
      <Screen accent={accent} dense={dense} />
    </div>
  );
}

function Body({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      className={`absolute rounded-t-[48%] bg-[#0e0e10]/85 ${className}`}
      style={style}
    />
  );
}

/**
 * Generated video thumbnail. No remote media: the scene is composed from the creator's face,
 * palette tints and a mock app UI. The hook caption is shown in the video's language.
 *
 * `fill` (the reels feed) fills the parent's width and height instead of sizing by aspect: the
 * scene keeps its `frame` aspect and covers the box, cropping what doesn't fit (pass
 * `frame="9:16"` to show a wide video as a vertical reel).
 */
export function VideoThumb({
  video,
  frame,
  fill = false,
  showHook = true,
  hookAt = "top",
  showMeta = true,
  showViews = true,
  playable = false,
  rounded = true,
  className = "",
  decorative = false,
}: {
  video: Video;
  /** Container aspect (crop). Defaults to the video's own aspect. */
  frame?: Aspect;
  /** Fill the parent (which must have a height) and cover it with the scene. */
  fill?: boolean;
  showHook?: boolean;
  /** "bottom" keeps the caption clear of overlays placed on the top edge (badges, buttons). */
  hookAt?: "top" | "bottom";
  showMeta?: boolean;
  /** Show the view count chip (when the video has stats). */
  showViews?: boolean;
  /** Shows a centred play affordance. */
  playable?: boolean;
  rounded?: boolean;
  className?: string;
  /** Hide from assistive tech when the surrounding element already names the video. */
  decorative?: boolean;
}) {
  const aspect = frame ?? video.aspect;
  const wide = ratio[aspect] >= 1;
  const [a, b] = video.tints;
  const accent = tintVar[b];
  const arabic = isArabic(video.lang);
  const format = formatById[video.format];

  return (
    <div
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `${video.title}. ${format?.name ?? ""}, ${clock(video.durationSec)}`}
      className={`y-thumb group w-full${fill ? " h-full" : ""} ${rounded ? "" : "!rounded-none"} ${className}`}
      style={
        fill
          ? {
              // A size container: the scene box below covers it using cqw/cqh.
              containerType: "size",
              background: `radial-gradient(120% 90% at 28% 18%, ${tintVar[a]} 0%, ${tintVar[b]} 100%)`,
            }
          : {
              aspectRatio: String(ratio[aspect]),
              containerType: "inline-size",
              background: `radial-gradient(120% 90% at 28% 18%, ${tintVar[a]} 0%, ${tintVar[b]} 100%)`,
            }
      }
    >
      {fill ? (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: `max(100cqw, calc(100cqh * ${ratio[aspect]}))`,
            aspectRatio: String(ratio[aspect]),
            containerType: "inline-size",
          }}
        >
          <Scene video={video} wide={wide} accent={accent} />
        </div>
      ) : (
        <Scene video={video} wide={wide} accent={accent} />
      )}

      {showHook ? (
        <div
          className={`absolute inset-x-[7%] z-[2] ${hookAt === "top" ? "top-[7%]" : "bottom-[15%]"} ${arabic ? "text-right" : "text-left"}`}
          dir={arabic ? "rtl" : "ltr"}
          lang={arabic ? "ar" : "en"}
          style={{ fontSize: wide ? "clamp(10px, 3.6cqw, 22px)" : "clamp(10px, 6.4cqw, 22px)" }}
        >
          <span className={`y-thumb-caption ${arabic ? "y-display" : ""}`}>{video.hook}</span>
        </div>
      ) : null}

      {showMeta ? (
        <div
          className="absolute inset-x-[6%] bottom-[5%] z-[2] flex items-center justify-between gap-2 text-white"
          style={{ fontSize: "clamp(10px, 4.6cqw, 13px)" }}
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 font-semibold backdrop-blur-sm">
            <Play size="1em" aria-hidden className="fill-current" />
            <span className="y-num">{clock(video.durationSec)}</span>
          </span>
          {video.stats && showViews ? (
            <span className="rounded-full bg-black/55 px-2 py-0.5 font-semibold backdrop-blur-sm">
              {compact(video.stats.views)} views
            </span>
          ) : null}
        </div>
      ) : null}

      {playable ? (
        <span
          aria-hidden
          className="y-play absolute top-1/2 left-1/2 z-[3] -translate-x-1/2 -translate-y-1/2"
          style={{ width: "clamp(40px, 22cqw, 72px)", height: "clamp(40px, 22cqw, 72px)" }}
        >
          <Play size="42%" className="ms-[6%] fill-current" />
        </span>
      ) : null}
    </div>
  );
}

function Scene({ video, wide, accent }: { video: Video; wide: boolean; accent: string }) {
  const faceId = video.creatorId;
  switch (video.scene) {
    case "screen":
      return wide ? (
        <>
          <div className="absolute inset-x-[14%] top-[24%] bottom-[16%] overflow-hidden rounded-[3%/5%] bg-[#0e0e10] p-[1%] shadow-[0_10px_30px_-10px_rgb(14_14_16/0.6)]">
            <div className="flex h-full overflow-hidden rounded-[2%/4%] bg-white" style={{ fontSize: "1.1cqw" }}>
              <div className="flex w-[22%] flex-col gap-[8%] bg-[#0e0e10]/[0.06] p-[3%]">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className="h-[0.7em] rounded-full bg-[#0e0e10]/20" style={i === 1 ? { background: accent } : undefined} />
                ))}
              </div>
              <div className="relative flex-1">
                <Screen accent={accent} dense />
              </div>
            </div>
          </div>
          <span className="absolute end-[10%] bottom-[10%] z-[1] grid aspect-square w-[9%] place-items-center rounded-full bg-[#0e0e10] text-white">
            <Mic size="50%" aria-hidden />
          </span>
        </>
      ) : (
        <>
          <Phone className="top-[22%] left-1/2 w-[58%] -translate-x-1/2" accent={accent} dense />
          <span
            className="absolute bottom-[18%] left-[58%] z-[1] aspect-square w-[11%] rounded-full border-[3px] border-white bg-white/40"
            aria-hidden
          />
          {video.format === "screen-walkthrough" ? (
            <span className="absolute start-[8%] bottom-[14%] z-[1] grid aspect-square w-[16%] place-items-center rounded-full bg-[#0e0e10] text-white">
              <Mic size="50%" aria-hidden />
            </span>
          ) : (
            <span className="absolute start-[7%] bottom-[13%] z-[1] w-[26%] rounded-full ring-[3px] ring-white">
              <FaceAvatar id={faceId} name="" size="100%" />
            </span>
          )}
        </>
      );
    case "split":
      return wide ? (
        <>
          <span className="absolute start-[10%] top-[30%] w-[26%]">
            <FaceAvatar id={faceId} name="" size="100%" />
          </span>
          <Body className="start-[6%] bottom-0 h-[22%] w-[34%]" />
          <Phone className="end-[14%] top-[18%] w-[20%] rotate-[4deg]" accent={accent} />
        </>
      ) : (
        <>
          <span className="absolute top-[22%] left-1/2 w-[44%] -translate-x-1/2">
            <FaceAvatar id={faceId} name="" size="100%" />
          </span>
          <Body className="top-[62%] left-1/2 h-[40%] w-[78%] -translate-x-1/2" />
          <div
            className="absolute inset-x-[10%] top-[56%] bottom-[14%] overflow-hidden rounded-[8%/12%] bg-[#0e0e10] p-[2%] shadow-[0_8px_24px_-8px_rgb(14_14_16/0.6)]"
            style={{ fontSize: "1.6cqw" }}
          >
            <div className="relative h-full overflow-hidden rounded-[6%/10%]">
              <Screen accent={accent} />
            </div>
          </div>
        </>
      );
    case "desk":
      return (
        <>
          <span className={`absolute ${wide ? "start-[38%] top-[16%] w-[22%]" : "top-[22%] left-1/2 w-[46%] -translate-x-1/2"}`}>
            <FaceAvatar id={faceId} name="" size="100%" />
          </span>
          <Body className={wide ? "start-[30%] top-[52%] h-[40%] w-[38%]" : "top-[52%] left-1/2 h-[36%] w-[84%] -translate-x-1/2"} />
          <div
            className={`absolute ${wide ? "start-[24%] end-[24%] bottom-[8%] h-[30%]" : "inset-x-[8%] bottom-[10%] h-[26%]"} rounded-[6%/14%] bg-[#e4e4df] p-[2%] shadow-[0_-4px_20px_-8px_rgb(14_14_16/0.4)]`}
            style={{ fontSize: "1.3cqw" }}
          >
            <div className="relative h-full overflow-hidden rounded-[4%/10%] bg-[#0e0e10]">
              <Screen accent={accent} />
            </div>
          </div>
        </>
      );
    case "street":
      return (
        <>
          <span className={`absolute ${wide ? "start-[22%] top-[26%] w-[22%]" : "start-[6%] top-[30%] w-[44%]"}`}>
            <FaceAvatar id={faceId} name="" size="100%" />
          </span>
          <span className={`absolute ${wide ? "end-[22%] top-[30%] w-[20%]" : "end-[6%] top-[36%] w-[40%]"}`}>
            <FaceAvatar id={`${faceId}-friend`} name="" size="100%" />
          </span>
          <Body className={wide ? "start-[18%] bottom-0 h-[34%] w-[30%]" : "start-0 bottom-0 h-[34%] w-[56%]"} />
          <Body className={wide ? "end-[18%] bottom-0 h-[30%] w-[28%] !bg-[#0e0e10]/70" : "end-0 bottom-0 h-[30%] w-[52%] !bg-[#0e0e10]/70"} />
          <Phone
            className={wide ? "start-[42%] bottom-[12%] w-[9%] -rotate-[10deg]" : "start-[40%] bottom-[16%] w-[20%] -rotate-[10deg]"}
            accent={accent}
          />
        </>
      );
    case "selfie":
    default:
      return wide ? (
        <>
          <span className="absolute start-[34%] top-[18%] w-[30%]">
            <FaceAvatar id={faceId} name="" size="100%" />
          </span>
          <Body className="start-[26%] bottom-0 h-[30%] w-[46%]" />
          <Phone className="end-[12%] bottom-[10%] w-[14%] rotate-[8deg]" accent={accent} />
        </>
      ) : (
        <>
          <span className="absolute top-[24%] left-1/2 w-[60%] -translate-x-1/2">
            <FaceAvatar id={faceId} name="" size="100%" />
          </span>
          <Body className="top-[68%] left-1/2 h-[40%] w-[92%] -translate-x-1/2" />
          <Phone className="end-[8%] bottom-[11%] w-[28%] rotate-[8deg]" accent={accent} />
        </>
      );
  }
}
