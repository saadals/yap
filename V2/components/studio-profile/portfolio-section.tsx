"use client";

import { ArrowLeftToLine, ChevronLeft, ChevronRight, Play, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";

import { VideoPlayer } from "@/components/domain/video-player";
import { VideoThumb } from "@/components/domain/video-thumb";
import { RowMenu, type MenuItem } from "@/components/studio-jobs/item-row";
import { EmptyState } from "@/components/ui/empty-state";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { clock, compact, plural } from "@/lib/format";
import { portfolio } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { formatById, languageById } from "@/lib/taxonomy";
import type { Creator, Video } from "@/lib/types";

import { AddVideoSheet } from "./add-video-sheet";
import { EditorSection } from "./section";

/**
 * Portfolio: the videos brands judge you by. Star the featured one (your card's cover), move the
 * most relevant first, preview, remove, add. Every change saves right away.
 */
export function PortfolioSection({ creator }: { creator: Creator }) {
  const s = useDemo();
  const toast = useToast();
  const videos = portfolio(s, creator);
  const [adding, setAdding] = useState(false);
  const [previewing, setPreviewing] = useState<Video | null>(null);
  const [removing, setRemoving] = useState<Video | null>(null);
  const [announce, setAnnounce] = useState("");
  const languageCount = new Set(videos.map((v) => v.lang)).size;

  const moveTo = (index: number, target: number) => {
    if (target < 0 || target >= videos.length || target === index) return;
    const ids = videos.map((v) => v.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(target, 0, moved);
    actions.reorderPortfolio(creator.id, ids);
    setAnnounce(`Moved “${videos[index].title}” to position ${target + 1} of ${videos.length}.`);
  };

  const feature = (video: Video) => {
    if (creator.featuredVideoId === video.id) return;
    const previous = creator.featuredVideoId;
    actions.updateCreator(creator.id, { featuredVideoId: video.id });
    toast({
      message: `Featured “${video.title}”. It's your card's cover now`,
      action: previous ? { label: "Undo", onClick: () => actions.updateCreator(creator.id, { featuredVideoId: previous }) } : undefined,
    });
  };

  return (
    <EditorSection
      id="portfolio"
      title="Portfolio"
      description={
        videos.length
          ? `${plural(videos.length, "video")} in ${plural(languageCount, "language")}. The starred one is featured: it's the cover of your card in Discover.`
          : "The videos brands judge you by. Two or three finished pieces are enough to start."
      }
      instant
      action={
        <PillButton variant="contrast" size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => setAdding(true)}>
          Add a video
        </PillButton>
      }
    >
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {videos.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {videos.map((video, index) => {
            const featured = creator.featuredVideoId === video.id;
            const items: MenuItem[] = [
              { label: "Preview", icon: <Play size={16} />, onSelect: () => setPreviewing(video) },
              ...(index > 0
                ? [
                    { label: "Move to the front", icon: <ArrowLeftToLine size={16} className="y-flip" />, onSelect: () => moveTo(index, 0) },
                    { label: "Move earlier", icon: <ChevronLeft size={16} className="y-flip" />, onSelect: () => moveTo(index, index - 1) },
                  ]
                : []),
              ...(index < videos.length - 1
                ? [{ label: "Move later", icon: <ChevronRight size={16} className="y-flip" />, onSelect: () => moveTo(index, index + 1) }]
                : []),
              { label: "Remove", icon: <Trash2 size={16} />, tone: "danger" as const, onSelect: () => setRemoving(video) },
            ];
            return (
              <li key={video.id} className="flex min-w-0 flex-col gap-2">
                <button
                  type="button"
                  className="relative block rounded-(--y-r-tile) text-start"
                  onClick={() => setPreviewing(video)}
                  aria-label={`Preview “${video.title}”`}
                >
                  <VideoThumb video={video} frame="4:5" playable decorative showViews={false} />
                </button>
                <div className="flex min-w-0 flex-col gap-0.5 px-0.5">
                  <p className="y-small truncate font-semibold">{video.title}</p>
                  <p className="y-micro y-fg-2 truncate">
                    {formatById[video.format].name} · {languageById[video.lang].name} · <span className="y-num">{clock(video.durationSec)}</span>
                    {video.stats ? ` · ${compact(video.stats.views)} views` : ""}
                  </p>
                </div>
                <div className="-ms-1 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    className="y-pill"
                    data-variant={featured ? "soft" : "ghost"}
                    data-size="sm"
                    aria-pressed={featured}
                    aria-label={featured ? `“${video.title}” is featured` : `Feature “${video.title}”`}
                    onClick={() => feature(video)}
                  >
                    <Star size={15} aria-hidden className={featured ? "fill-current" : ""} />
                    {featured ? "Featured" : "Feature"}
                  </button>
                  <RowMenu label={`More for “${video.title}”`} items={items} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          headingLevel={3}
          title="Your portfolio is empty"
          body="Brands can't order what they can't see. Add two or three finished videos to start getting invites."
          action={
            <PillButton variant="contrast" icon={<Plus size={18} aria-hidden />} onClick={() => setAdding(true)}>
              Add your first video
            </PillButton>
          }
        />
      )}

      <AddVideoSheet open={adding} onClose={() => setAdding(false)} creator={creator} />

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
        description={removing ? `“${removing.title}” comes off your public profile and out of your pitch samples.` : undefined}
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
                toast({ message: `Removed “${removing.title}”` });
                setRemoving(null);
              }}
            >
              Remove video
            </PillButton>
          </div>
        }
      >
        <p className="y-small y-fg-2">Pitches you&apos;ve already sent keep their samples. To show it again later, upload it again.</p>
      </Sheet>
    </EditorSection>
  );
}
