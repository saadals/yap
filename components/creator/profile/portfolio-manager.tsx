"use client";

import { ChevronLeft, ChevronRight, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";

import { VideoPlayer } from "@/components/domain/video-player";
import { VideoThumb } from "@/components/domain/video-thumb";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { clock, compact } from "@/lib/format";
import { actions, useDemo } from "@/lib/store";
import { portfolio } from "@/lib/selectors";
import { formatById, languageById } from "@/lib/taxonomy";
import type { Creator, Video } from "@/lib/types";

import { AddVideoSheet } from "./add-video-sheet";
import { ProfileSection } from "./section";

/** Portfolio: feature, reorder, preview, remove and add. Every change saves immediately. */
export function PortfolioManager({ creator }: { creator: Creator }) {
  const s = useDemo();
  const toast = useToast();
  const videos = portfolio(s, creator);
  const [adding, setAdding] = useState(false);
  const [previewing, setPreviewing] = useState<Video | null>(null);
  const [removing, setRemoving] = useState<Video | null>(null);
  const [announce, setAnnounce] = useState("");
  const languageCount = new Set(videos.map((v) => v.lang)).size;

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= videos.length) return;
    const ids = videos.map((v) => v.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    actions.reorderPortfolio(creator.id, ids);
    setAnnounce(`Moved "${videos[index].title}" to position ${target + 1} of ${videos.length}.`);
  };

  const feature = (video: Video) => {
    if (creator.featuredVideoId === video.id) return;
    const previous = creator.featuredVideoId;
    actions.updateCreator(creator.id, { featuredVideoId: video.id });
    toast({
      message: `Featured "${video.title}". It's the first thing buyers see.`,
      action: previous ? { label: "Undo", onClick: () => actions.updateCreator(creator.id, { featuredVideoId: previous }) } : undefined,
    });
  };

  return (
    <ProfileSection
      id="portfolio"
      title="Portfolio"
      description="Star your strongest piece and put the most relevant first. Changes save as you go."
      summary={`${videos.length} ${videos.length === 1 ? "video" : "videos"} · ${languageCount} ${languageCount === 1 ? "language" : "languages"}`}
      aside={
        <PillButton variant="neon" arrow onClick={() => setAdding(true)}>
          Add video
        </PillButton>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        <span className="y-chip">
          <span className="y-num font-semibold">{videos.length}</span> videos
          {videos.length < 5 ? <span className="y-fg-2">· add {5 - videos.length} more for a full profile</span> : null}
        </span>
        <span className="y-chip">
          <span className="y-num font-semibold">{languageCount}</span> {languageCount === 1 ? "language" : "languages"}
        </span>
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {videos.length ? (
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
          {videos.map((video, index) => {
            const featured = creator.featuredVideoId === video.id;
            return (
              <li key={video.id} className="y-tile flex flex-col gap-2 p-2">
                <button
                  type="button"
                  className="relative block rounded-(--y-r-tile) text-start"
                  onClick={() => setPreviewing(video)}
                  aria-label={`Preview "${video.title}"`}
                >
                  <VideoThumb video={video} frame="4:5" playable decorative />
                  {featured ? (
                    <Badge tone="ink" icon={<Star size={13} aria-hidden className="fill-current" />} className="absolute start-2 bottom-2 z-[4]">
                      Featured
                    </Badge>
                  ) : null}
                  <span className="y-micro absolute end-2 top-2 z-[4] rounded-full bg-black/60 px-2 py-0.5 font-semibold text-white">
                    #{index + 1}
                  </span>
                </button>
                <div className="flex flex-col gap-0.5 px-1">
                  <p className="y-small y-clamp-2 font-semibold">{video.title}</p>
                  <p className="y-micro y-fg-2">
                    {formatById[video.format].name} ·{" "}
                    {languageById[video.lang].name} ·{" "}
                    <span className="y-num">{clock(video.durationSec)}</span>
                    {video.stats ? ` · ${compact(video.stats.views)} views` : ""}
                  </p>
                </div>
                <div className="mt-auto flex items-center justify-between gap-1 px-0.5 pb-0.5">
                  <RoundIconButton
                    size="sm"
                    label={featured ? "Featured video" : `Feature "${video.title}"`}
                    aria-pressed={featured}
                    onClick={() => feature(video)}
                  >
                    <Star size={16} className={featured ? "fill-current" : ""} />
                  </RoundIconButton>
                  <span className="flex gap-1">
                    <RoundIconButton
                      size="sm"
                      label={`Move "${video.title}" earlier`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ChevronLeft size={18} className="y-flip" />
                    </RoundIconButton>
                    <RoundIconButton
                      size="sm"
                      label={`Move "${video.title}" later`}
                      disabled={index === videos.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ChevronRight size={18} className="y-flip" />
                    </RoundIconButton>
                    <RoundIconButton size="sm" label={`Remove "${video.title}"`} onClick={() => setRemoving(video)}>
                      <Trash2 size={16} />
                    </RoundIconButton>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          headingLevel={3}
          title="Your portfolio is empty"
          body="Buyers can't order what they can't see. Add two or three finished videos to start getting invites."
          shape="bean"
          tint="mint"
          action={
            <PillButton variant="contrast" icon={<Plus size={18} aria-hidden />} onClick={() => setAdding(true)}>
              Add your first video
            </PillButton>
          }
        />
      )}

      <AddVideoSheet open={adding} onClose={() => setAdding(false)} creator={creator} portfolioCount={videos.length} />

      <Sheet
        open={previewing !== null}
        onClose={() => setPreviewing(null)}
        title={previewing?.title ?? "Preview"}
        description={
          previewing
            ? `${formatById[previewing.format].name} · ${languageById[previewing.lang].name}${previewing.madeFor ? ` · Made for ${previewing.madeFor}` : " · Spec piece"}`
            : undefined
        }
      >
        {previewing ? (
          <div className="flex flex-col items-center gap-4">
            <VideoPlayer video={previewing} size="sm" />
            {previewing.stats ? (
              <p className="y-small y-fg-2">
                {compact(previewing.stats.views)} views
                {previewing.stats.watchThroughPct ? ` · ${previewing.stats.watchThroughPct}% watched to the end` : ""}
              </p>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={removing !== null}
        onClose={() => setRemoving(null)}
        side="center"
        width="sm"
        title="Remove this video?"
        description={removing ? `"${removing.title}" will disappear from your public profile and pitch samples.` : undefined}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <PillButton variant="ghost" onClick={() => setRemoving(null)}>
              Keep it
            </PillButton>
            <PillButton
              variant="contrast"
              icon={<Trash2 size={16} aria-hidden />}
              onClick={() => {
                if (!removing) return;
                actions.removePortfolioVideo(creator.id, removing.id);
                toast({ message: `Removed "${removing.title}" from your portfolio.` });
                setRemoving(null);
              }}
            >
              Remove video
            </PillButton>
          </div>
        }
      >
        <p className="y-small y-fg-2">
          Pitches you&apos;ve already sent keep their samples. To show it again later, upload it again.
        </p>
      </Sheet>
    </ProfileSection>
  );
}
