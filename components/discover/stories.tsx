"use client";

import { Play } from "lucide-react";
import { useRef } from "react";

import { VideoThumb } from "@/components/domain/video-thumb";
import { SampleChip } from "@/components/ui/tags";
import { businessById, portfolio } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { nicheById } from "@/lib/taxonomy";
import type { Creator, Video } from "@/lib/types";

import { SAMPLE_FLOATING_RESULTS, SAMPLE_STORIES, type SampleStory } from "./sample";

/** Where each card sits in the fan (Discover 4.7): x, y, rotation, scale, surface. */
const FAN = [
  { x: -500, y: 52, r: -10, s: 0.9, look: "paper" },
  { x: -258, y: 18, r: -5, s: 0.96, look: "tint" },
  { x: 0, y: 0, r: 0, s: 1.04, look: "neon" },
  { x: 258, y: 18, r: 5, s: 0.96, look: "tint" },
  { x: 500, y: 52, r: 10, s: 0.9, look: "paper" },
] as const;

/**
 * The creators behind a sample story: real creators who work in the brand's category, most
 * experienced first (the stories themselves are sample data).
 */
export function storyCreators(s: DemoState, story: SampleStory, count = 3): Creator[] {
  const business = businessById(s, story.businessId);
  const niche = business?.industry;
  return s.creators
    .filter((c) => (niche ? c.niches.includes(niche) : true))
    .sort((a, b) => b.completed - a.completed || a.id.localeCompare(b.id))
    .slice(0, count);
}

/** The video on a story card: the lead creator's piece in the brand's category, if they have one. */
export function storyVideo(s: DemoState, story: SampleStory): Video | undefined {
  const lead = storyCreators(s, story, 1)[0];
  if (!lead) return undefined;
  const niche = businessById(s, story.businessId)?.industry;
  const videos = portfolio(s, lead);
  return videos.find((v) => v.niche === niche && v.aspect === "9:16") ?? videos.find((v) => v.aspect === "9:16") ?? videos[0];
}

/**
 * Success stories: a dark stage with five cards fanned from the bottom edge. Pointing at or
 * focusing a card lifts and straightens it; choosing one opens the story. ← and → move between
 * cards. The stories are sample data and say so.
 */
export function Stories({ s, onOpen }: { s: DemoState; onOpen: (index: number) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + SAMPLE_STORIES.length) % SAMPLE_STORIES.length;
    refs.current[next]?.focus();
  };
  return (
    <section className="y-dsc-sec" aria-labelledby="dsc-stories-title">
      <div className="y-dsc-stage" data-tone="night">
        <span className="y-eyebrow y-dsc-stage-eyebrow">Success stories</span>
        <h2 id="dsc-stories-title" className="y-display y-dsc-stage-h2">
          What happened <br />
          when they hit post
        </h2>
        <p className="y-dsc-stage-sub">
          Tech brands, their Yapps, and what changed. Point at a card to lift it, choose one to read
          the full story.
        </p>
        <SampleChip className="y-dsc-stage-chip">Sample stories</SampleChip>
        {SAMPLE_FLOATING_RESULTS.map((chip, index) => (
          <span key={chip.label} aria-hidden className="y-dsc-fchip" data-i={index}>
            {chip.label} <b>{chip.value}</b>
          </span>
        ))}
        <div className="y-dsc-fan">
          {SAMPLE_STORIES.map((story, index) => {
            const place = FAN[index];
            const business = businessById(s, story.businessId);
            const video = storyVideo(s, story);
            const lead = storyCreators(s, story, 1)[0];
            const result = story.results[0];
            if (!business) return null;
            return (
              <button
                key={story.id}
                ref={(node) => {
                  refs.current[index] = node;
                }}
                type="button"
                className="y-dsc-sc"
                data-look={place.look}
                style={
                  {
                    "--x": `${place.x}px`,
                    "--y": `${place.y}px`,
                    "--r": `${place.r}deg`,
                    "--s": place.s,
                    zIndex: 10 - Math.abs(index - 2),
                  } as React.CSSProperties
                }
                onClick={() => onOpen(index)}
                onKeyDown={(event) => onKeyDown(event, index)}
                aria-label={`${business.name}: ${story.title}. ${result.value} ${result.label}. Sample story`}
              >
                <span className="y-dsc-sc-top">
                  <span className="min-w-0">
                    <span className="y-dsc-sc-brand">{business.name}</span>
                    <span className="y-dsc-sc-cat">{nicheById[business.industry]?.name}</span>
                  </span>
                  <span className="y-dsc-sc-res">
                    {result.value} <i>{result.label}</i>
                  </span>
                </span>
                <span className="y-dsc-sc-t">{story.title}</span>
                <span className="y-dsc-sc-ph" aria-hidden>
                  {video ? (
                    <VideoThumb video={video} frame="9:16" fill showHook={false} showMeta={false} decorative />
                  ) : null}
                </span>
                <span className="y-dsc-sc-watch" aria-hidden>
                  <Play size={12} className="fill-current" />
                  Watch the Yapp
                  {lead ? <span className="sr-only"> by {lead.name}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
