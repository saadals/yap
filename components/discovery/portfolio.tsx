"use client";

import { Eye, Gauge, Star } from "lucide-react";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { FormatChip } from "@/components/domain/chips";
import { VideoPlayer } from "@/components/domain/video-player";
import { VideoThumb } from "@/components/domain/video-thumb";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { Chip, FilterChip } from "@/components/ui/chip";
import { Ar } from "@/components/ui/page";
import { Sheet } from "@/components/ui/sheet";
import { clock, compact, lengthLabel, plural } from "@/lib/format";
import { featuredVideo, portfolio } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { formatById, isArabic, languageById } from "@/lib/taxonomy";
import type { Beat, Creator, FormatId, Video } from "@/lib/types";

const beatLabel: Record<Beat, string> = {
  hook: "Hook",
  problem: "Problem",
  demo: "Demo",
  proof: "Proof",
  cta: "Call to action",
};

function MadeFor({ s, video, size = 28 }: { s: DemoState; video: Video; size?: number }) {
  if (!video.madeFor) return <span className="y-small y-fg-2">Spec piece (not client work)</span>;
  const business = s.businesses.find((b) => b.name === video.madeFor);
  return (
    <span className="y-small inline-flex items-center gap-2">
      {business ? <BusinessLogo business={business} size={size} /> : null}
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

function Script({ video }: { video: Video }) {
  const arabic = isArabic(video.lang);
  return (
    <ol className="flex flex-col gap-2">
      {video.script.map((line) => (
        <li key={line.at} className="y-tile flex gap-3 p-3">
          <span className="y-micro y-num y-fg-2 w-10 flex-none pt-0.5">{clock(line.at)}</span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="y-micro y-fg-3 font-semibold">{beatLabel[line.beat]}</span>
            {arabic ? (
              <Ar as="p" className="y-body">
                {line.text}
              </Ar>
            ) : (
              <p className="y-body">{line.text}</p>
            )}
            {line.translation ? <p className="y-small y-fg-2">{line.translation}</p> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function FeaturedWork({ s, creator }: { s: DemoState; creator: Creator }) {
  const video = featuredVideo(s, creator);
  if (!video) return null;
  const arabic = isArabic(video.lang);
  return (
    <Block tone="paper" pad="md" aria-labelledby="featured-heading">
      <div
        className={`grid gap-6 ${
          video.aspect === "16:9" ? "" : "md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:items-start"
        }`}
      >
        <VideoPlayer key={video.id} video={video} size="md" className="mx-auto w-full" />
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Badge tone="ink" icon={<Star size={13} aria-hidden className="fill-current" />} className="w-fit">
              Featured work
            </Badge>
            <h2 id="featured-heading" className="y-display y-title">
              {video.title}
            </h2>
            <MadeFor s={s} video={video} />
            <Stats video={video} />
          </div>
          <div className="y-tile flex flex-col gap-1.5 p-4">
            <span className="y-micro y-fg-2">Opening line</span>
            {arabic ? (
              <Ar as="p" className="y-display text-[22px] leading-snug">
                {video.hook}
              </Ar>
            ) : (
              <p className="y-display text-[22px] leading-snug">{video.hook}</p>
            )}
            {video.hookTranslation ? (
              <p className="y-small y-fg-2">&ldquo;{video.hookTranslation}&rdquo;</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FormatChip id={video.format} />
            <Chip>{languageById[video.lang].name}</Chip>
            <Chip>
              {lengthLabel(video.durationSec)} · {video.aspect}
            </Chip>
          </div>
          <div className="flex flex-col gap-2">
            <span className="y-micro y-fg-2">How it&apos;s built</span>
            <ol className="flex flex-wrap gap-x-4 gap-y-1">
              {video.script.map((line) => (
                <li key={line.at} className="y-small">
                  <span className="y-num y-fg-3 me-1.5">{clock(line.at)}</span>
                  {beatLabel[line.beat]}
                </li>
              ))}
            </ol>
          </div>
          <p className="y-micro y-fg-3">
            Press play for captions{arabic ? " with an English translation" : ""}. Playback is
            simulated in this prototype.
          </p>
        </div>
      </div>
    </Block>
  );
}

export function PortfolioGrid({ s, creator }: { s: DemoState; creator: Creator }) {
  const videos = portfolio(s, creator);
  const [format, setFormat] = useState<FormatId | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const present = creator.formats
    .concat(videos.map((v) => v.format))
    .filter((id, index, list) => list.indexOf(id) === index && videos.some((v) => v.format === id));
  const shown = format ? videos.filter((v) => v.format === format) : videos;
  const open = videos.find((v) => v.id === openId) ?? null;

  if (!videos.length) {
    return (
      <Block tone="paper" pad="md" className="flex flex-col gap-2">
        <h2 className="y-display y-title">Portfolio</h2>
        <p className="y-body y-fg-2">
          {creator.firstName} hasn&apos;t added portfolio videos yet. Ask for samples in a message
          before you commission.
        </p>
      </Block>
    );
  }

  return (
    <Block tone="paper" pad="md" className="flex flex-col gap-5" aria-labelledby="portfolio-heading" id="portfolio">
      <div className="flex flex-col gap-1">
        <h2 id="portfolio-heading" className="y-display y-title">
          Portfolio
        </h2>
        <p className="y-small y-fg-2">
          {plural(videos.length, "video")} made for real apps. Open any to watch it with the script
          and translation.
        </p>
      </div>
      {present.length > 1 ? (
        <div className="y-scroll-x -mx-1 flex gap-2 px-1" role="group" aria-label="Filter portfolio by format">
          <FilterChip pressed={format === null} onClick={() => setFormat(null)} count={videos.length}>
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
                icon={<Icon size={16} aria-hidden />}
                className="flex-none"
              >
                {formatById[id].name}
              </FilterChip>
            );
          })}
        </div>
      ) : null}
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {shown.map((video) => (
          <li key={video.id}>
            <button
              type="button"
              onClick={() => setOpenId(video.id)}
              aria-label={`Watch ${video.title}`}
              className="group flex w-full flex-col gap-2 rounded-(--y-r-tile) text-start"
            >
              <span className="block w-full transition-transform duration-(--y-dur-2) group-hover:scale-[0.985]">
                <VideoThumb video={video} frame="4:5" playable decorative />
              </span>
              <span className="flex flex-col gap-0.5 px-1 pb-1">
                <span className="y-small y-clamp-2 font-semibold">{video.title}</span>
                <span className="y-micro y-fg-2 truncate">
                  {video.madeFor ? `Made for ${video.madeFor}` : "Spec piece"} ·{" "}
                  {languageById[video.lang].short}
                  {video.stats ? ` · ${compact(video.stats.views)} views` : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Sheet
        open={open !== null}
        onClose={() => setOpenId(null)}
        title={open?.title ?? "Video"}
        description={open ? `${formatById[open.format].name} · ${languageById[open.lang].name} · ${lengthLabel(open.durationSec)}` : undefined}
        width="lg"
      >
        {open ? (
          <div
            className={`grid gap-6 pt-2 ${
              open.aspect === "16:9" ? "" : "md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:items-start"
            }`}
          >
            <VideoPlayer key={open.id} video={open} size="sm" className="mx-auto w-full" />
            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-col gap-2">
                <MadeFor s={s} video={open} />
                <Stats video={open} />
                <div className="flex flex-wrap gap-1.5">
                  <FormatChip id={open.format} />
                  <Chip>{languageById[open.lang].short}</Chip>
                  <Chip>{open.aspect}</Chip>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="y-head">Script</h3>
                <Script video={open} />
              </div>
            </div>
          </div>
        ) : null}
      </Sheet>
    </Block>
  );
}
