"use client";

import Link from "next/link";

import { VideoThumb } from "@/components/domain/video-thumb";
import type { LibraryItem } from "@/components/library/data";
import { shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";

/** A strip of the newest approved videos; each opens in the Library. */
export function LatestVideos({ items }: { items: LibraryItem[] }) {
  return (
    <ul className="y-scroll-x -mx-(--y-gutter) flex gap-3 px-(--y-gutter) md:mx-0 md:grid md:grid-cols-5 md:px-0">
      {items.map((item) => (
        <li key={item.id} className="w-[132px] flex-none md:w-auto">
          <Link
            href={paths.library({ video: item.id })}
            className="group flex flex-col gap-2 rounded-(--y-r-tile)"
            aria-label={`${item.commission.title}, by ${item.creator?.name ?? "a creator"}. Open in the Library`}
          >
            <VideoThumb
              video={item.video}
              frame="9:16"
              showHook={false}
              showViews={false}
              playable
              decorative
              className="transition-transform duration-(--y-dur-2) group-hover:-translate-y-0.5"
            />
            <span className="flex min-w-0 flex-col px-0.5">
              <span className="y-small truncate font-medium">{item.creator?.name ?? "Creator"}</span>
              <span className="y-micro y-fg-2 truncate">
                {item.product?.name ?? "Video"} · {shortDate(item.approvedAt)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
