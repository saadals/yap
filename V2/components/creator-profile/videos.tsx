"use client";

import { Eye, Gauge, Play, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { VideoPlayer } from "@/components/domain/video-player";
import { VideoThumb } from "@/components/domain/video-thumb";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { InLang } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { compact, lengthLabel, quoted } from "@/lib/format";
import { paths } from "@/lib/paths";
import { featuredVideo, portfolio } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { formatById, languageById } from "@/lib/taxonomy";
import type { Creator, FormatId, Video } from "@/lib/types";

function MadeFor({ s, video }: { s: DemoState; video: Video }) {
  if (!video.madeFor) return <span className="y-small y-fg-2">Spec piece, not client work</span>;
  const business = s.businesses.find((b) => b.name === video.madeFor);
  return (
    <span className="y-small inline-flex items-center gap-2">
      {business ? <BusinessLogo business={business} size={24} /> : null}
      <span>
        Made for <span className="font-semibold">{video.madeFor}</span>
      </span>
    </span>
  );
}

function Stats({ video }: { video: Video }) {
  if (!video.stats) return null;
  return (
    <span className="y-small y-fg-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="inline-flex items-center gap-1.5">
        <Eye size={15} aria-hidden /> {compact(video.stats.views)} views
      </span>
      {video.stats.watchThroughPct ? (
        <span className="inline-flex items-center gap-1.5">
          <Gauge size={15} aria-hidden /> {video.stats.watchThroughPct}% watched to the end
        </span>
      ) : null}
    </span>
  );
}

/**
 * The work, first: the featured video playing in place with what it was made for, then every
 * other video as a grid (filter by format). A tile opens Watch on that video, scoped to this
 * creator, so you can swipe through the rest; "Watch all" starts at the top.
 */
export function VideosBlock({ s, creator }: { s: DemoState; creator: Creator }) {
  const videos = portfolio(s, creator);
  const featured = featuredVideo(s, creator);
  const [format, setFormat] = useState<FormatId | null>(null);
  const present = creator.formats
    .concat(videos.map((v) => v.format))
    .filter((id, index, all) => all.indexOf(id) === index && videos.some((v) => v.format === id));
  const shown = format ? videos.filter((v) => v.format === format) : videos.filter((v) => v.id !== featured?.id);

  if (!videos.length || !featured) {
    return (
      <Block tone="paper" pad="md" className="flex flex-col gap-2" aria-labelledby="videos-heading">
        <h2 id="videos-heading" className="y-display y-title">
          Videos
        </h2>
        <p className="y-body y-fg-2 max-w-[62ch]">
          {creator.firstName} hasn&apos;t added videos yet. Ask for samples in a message before you order.
        </p>
      </Block>
    );
  }

  const wide = featured.aspect === "16:9";
  return (
    <Block tone="paper" pad="md" className="flex scroll-mt-24 flex-col gap-5" aria-labelledby="videos-heading" id="videos">
      <div className="flex items-center justify-between gap-3">
        <h2 id="videos-heading" className="y-display y-title">
          Videos <span className="y-fg-2 y-small font-normal tracking-normal">{videos.length}</span>
          <span className="sr-only"> in the portfolio</span>
        </h2>
        <PillButton
          href={paths.watch({ creator: creator.handle })}
          variant="outline"
          size="sm"
          icon={<Play size={14} aria-hidden className="fill-current" />}
        >
          Watch all
        </PillButton>
      </div>

      {/* Featured, playing in place */}
      <div className={`grid gap-5 ${wide ? "" : "md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:items-start md:gap-7"}`}>
        <VideoPlayer key={featured.id} video={featured} size="sm" className="mx-auto w-full" />
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="y-micro y-fg-2 inline-flex items-center gap-1.5 font-medium">
              <Star size={12} aria-hidden className="fill-current" /> Featured
            </span>
            <h3 className="y-head">{featured.title}</h3>
            <p className="y-small y-fg-2">
              {formatById[featured.format].name} · {languageById[featured.lang].name} · {lengthLabel(featured.durationSec)}
            </p>
            <MadeFor s={s} video={featured} />
            <Stats video={featured} />
          </div>
          <div className="flex flex-col gap-1 border-s-2 border-(--b-line) ps-4">
            <span className="y-micro y-fg-2">Opening line</span>
            <InLang lang={featured.lang} as="p" className="y-body self-start">
              {featured.hook}
            </InLang>
            {featured.hookTranslation ? <p className="y-small y-fg-2">{quoted(featured.hookTranslation)}</p> : null}
          </div>
        </div>
      </div>

      {/* Everything else */}
      {present.length > 1 ? (
        <div className="y-scroll-x -mx-1 flex gap-2 px-1" role="group" aria-label="Filter videos by format">
          <FilterChip pressed={format === null} onClick={() => setFormat(null)} className="y-dsc-chip flex-none">
            All
          </FilterChip>
          {present.map((id) => {
            const Icon = formatById[id].icon;
            return (
              <FilterChip
                key={id}
                pressed={format === id}
                onClick={() => setFormat(format === id ? null : id)}
                count={videos.filter((v) => v.format === id).length}
                icon={<Icon size={15} aria-hidden />}
                className="y-dsc-chip flex-none"
              >
                {formatById[id].name}
              </FilterChip>
            );
          })}
        </div>
      ) : null}
      {shown.length ? (
        <ul className="grid grid-cols-2 gap-x-2 gap-y-4 md:grid-cols-3">
          {shown.map((video) => (
            <li key={video.id}>
              <Link
                href={paths.watch({ creator: creator.handle, video: video.id })}
                aria-label={`Watch ${video.title}`}
                className="group flex flex-col gap-2 rounded-(--y-r-tile)"
              >
                <span className="relative block aspect-[3/4] overflow-hidden rounded-(--y-r-tile) transition-transform duration-(--y-dur-2) group-hover:scale-[0.985]">
                  <VideoThumb video={video} frame="9:16" fill hookAt="bottom" playable decorative />
                </span>
                <span className="flex flex-col gap-0.5 px-0.5">
                  <span className="y-small y-clamp-2 font-medium">{video.title}</span>
                  <span className="y-micro y-fg-2 truncate">
                    {video.madeFor ? `Made for ${video.madeFor}` : "Spec piece"} · {languageById[video.lang].name}
                    {video.stats ? ` · ${compact(video.stats.views)} views` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </Block>
  );
}
