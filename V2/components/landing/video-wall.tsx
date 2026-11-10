"use client";

import Link from "next/link";

import { VideoThumb } from "@/components/domain/video-thumb";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { money } from "@/lib/format";
import { paths } from "@/lib/paths";
import { startingPrice } from "@/lib/selectors";
import { formatById } from "@/lib/taxonomy";
import type { Creator, Video } from "@/lib/types";

export type Sample = { video: Video; creator: Creator };

/** One sample: the vertical video with its hook, who made it and where their prices start. */
export function VideoCard({
  item,
  hidden = false,
  compact = false,
  className = "",
}: {
  item: Sample;
  hidden?: boolean;
  /** Name only (narrow cards). */
  compact?: boolean;
  className?: string;
}) {
  const { video, creator } = item;
  return (
    <Link
      href={paths.watch({ video: video.id })}
      className={`y-vcard ${className}`}
      tabIndex={hidden ? -1 : undefined}
      aria-label={`Watch ${creator.name}'s ${formatById[video.format]?.name.toLowerCase() ?? "video"}: ${video.title}`}
    >
      <VideoThumb video={video} frame="9:16" showMeta={false} decorative />
      <span className="flex items-center gap-2 px-1.5 pt-2.5 pb-1">
        <FaceAvatar id={creator.id} name="" size={22} />
        <span className="y-small min-w-0 truncate font-medium">{creator.firstName}</span>
        {compact ? null : (
          <span className="y-small y-fg-2 ms-auto flex-none">From {money(startingPrice(creator))}</span>
        )}
      </span>
    </Link>
  );
}

/**
 * The hero's sample videos. Desktop: three columns drifting slowly, the middle one the other way (paused
 * on hover or focus, still with reduced motion). Phones: a row you swipe, which never moves by
 * itself. Each card opens Watch on that video.
 */
export function VideoWall({ items }: { items: Sample[] }) {
  const columns = [0, 1, 2].map((c) => items.filter((_, i) => i % 3 === c));
  return (
    <>
      <div className="y-wall max-lg:hidden" role="group" aria-label="Sample videos">
        {columns.map((column, c) => (
          <div key={c} className="y-wall-col" data-col={c}>
            <ul className="y-wall-track">
              {/* The column repeats once so the drift loops without a jump; the copy is hidden. */}
              {[...column, ...column].map((item, i) => (
                <li key={`${item.video.id}-${i}`} aria-hidden={i >= column.length || undefined}>
                  <VideoCard item={item} hidden={i >= column.length} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <ul
        className="y-scroll-x -mx-(--y-gutter) flex snap-x scroll-px-(--y-gutter) gap-2.5 px-(--y-gutter) pb-1 lg:hidden"
        aria-label="Sample videos"
      >
        {items.map((item) => (
          <li key={item.video.id} className="w-[44vw] max-w-[200px] flex-none snap-start">
            <VideoCard item={item} />
          </li>
        ))}
      </ul>
    </>
  );
}
