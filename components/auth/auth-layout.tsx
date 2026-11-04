"use client";

import { Check } from "lucide-react";

import { VideoThumb } from "@/components/domain/video-thumb";
import { Block } from "@/components/ui/block";
import { Cast, duoCast } from "@/components/ui/character";
import { Page } from "@/components/ui/page";
import { useDemo } from "@/lib/store";
import type { Video } from "@/lib/types";

/**
 * Auth composition. Mobile: visual strip → form → extra. Desktop: the form block on the start
 * side spanning two rows, the visual and the extra block stacked on the end side.
 */
export function AuthLayout({
  visual,
  extra,
  children,
}: {
  visual: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Page>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:grid-rows-[auto_1fr]">
        <div
          className={`flex flex-col lg:col-span-5 lg:col-start-8 lg:row-start-1 ${extra ? "" : "lg:row-span-2"}`}
        >
          {visual}
        </div>
        <Block
          tone="paper"
          pad="lg"
          className="flex flex-col justify-center lg:col-span-7 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:min-h-[calc(100dvh-112px)]"
        >
          <div className="mx-auto flex w-full max-w-md flex-col gap-6">{children}</div>
        </Block>
        {extra ? (
          <div className="flex flex-col lg:col-span-5 lg:col-start-8 lg:row-start-2">{extra}</div>
        ) : null}
      </div>
    </Page>
  );
}

const featuredIds = ["v-layla-1", "v-omar-4", "v-hana-1"];

function useShowcase(): Video[] {
  const s = useDemo();
  const picked = featuredIds
    .map((id) => s.videos.find((video) => video.id === id))
    .filter((video): video is Video => Boolean(video));
  return picked.length === 3 ? picked : s.videos.slice(0, 3);
}

/** Lavender brand moment: headline, a fan of real-looking samples, trust points, the duo cast. */
export function AuthVisual({ title, points }: { title: React.ReactNode; points: string[] }) {
  const videos = useShowcase();
  return (
    <Block
      tone="lavender"
      pad="lg"
      className="relative flex h-full flex-col gap-6 overflow-hidden !pb-0"
    >
      <div className="flex items-end justify-between gap-4 lg:flex-col lg:items-stretch">
        <p className="y-display y-title max-w-[22ch] lg:text-[34px] lg:leading-[1.06]">{title}</p>
        <Cast
          members={duoCast}
          viewBox="-10 -6 196 136"
          animate
          className="-mb-px h-20 w-auto flex-none lg:hidden"
        />
      </div>

      {videos.length === 3 ? (
        <div className="relative hidden aspect-[5/3] lg:block" aria-hidden>
          <div className="absolute start-[2%] top-[5%] w-[30%] -rotate-6">
            <VideoThumb video={videos[0]} decorative showMeta={false} />
          </div>
          <div className="absolute start-[33%] top-0 z-[1] w-[33%]">
            <VideoThumb video={videos[1]} decorative showMeta={false} />
          </div>
          <div className="absolute end-[2%] top-[7%] w-[30%] rotate-6">
            <VideoThumb video={videos[2]} decorative showMeta={false} />
          </div>
        </div>
      ) : null}

      <div className="mt-auto hidden items-end justify-between gap-4 lg:flex">
        <ul className="flex flex-col gap-2 pb-8">
          {points.map((point) => (
            <li key={point} className="y-small flex items-center gap-2 font-medium">
              <span
                aria-hidden
                className="grid size-6 flex-none place-items-center rounded-full bg-(--y-on-color) text-(--y-lavender)"
              >
                <Check size={14} strokeWidth={3} />
              </span>
              {point}
            </li>
          ))}
        </ul>
        <Cast
          members={duoCast}
          viewBox="-10 -6 196 136"
          animate
          className="-mb-px h-32 w-auto flex-none xl:h-36"
        />
      </div>
    </Block>
  );
}
