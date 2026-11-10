"use client";

import { ArrowLeft, BadgeCheck, Star } from "lucide-react";

import { VideoThumb } from "@/components/domain/video-thumb";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { quoted, weekdayDate } from "@/lib/format";
import { cityById, videoById } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { creatorKindById } from "@/lib/taxonomy";
import type { ContentRequest, Product, Video } from "@/lib/types";

import "@/app/styles/order-owner.css";

import { DaysText, PriceText, RatingOrNew } from "./pitch-card";
import { budgetNote, deliveryInfo, fitTags, type RankedPitch } from "./shared";

function Best({ children }: { children: React.ReactNode }) {
  return (
    <span className="y-badge !min-h-6 !px-2 !text-[11px]" data-tone-badge="ink">
      {children}
    </span>
  );
}

function Cell({ label, children, best }: { label: string; children: React.ReactNode; best?: string }) {
  return (
    <div className="oo-cell flex flex-col gap-1 px-4 py-3">
      <span className="y-micro y-fg-2 flex min-h-6 items-center justify-between gap-2">
        {label}
        {best ? <Best>{best}</Best> : null}
      </span>
      <div className="y-small">{children}</div>
    </div>
  );
}

/**
 * The shortlist side by side: one column per pitch, the same facts on the same line (subgrid),
 * small tags for the best on each line, and a Hire button per column. Columns scroll sideways on
 * phones (snapping), and when more than three are shortlisted.
 */
export function CompareView({
  s,
  request,
  product,
  items,
  canHire,
  onBack,
  onHire,
  onOpen,
  onPlay,
  onShortlist,
}: {
  s: DemoState;
  request: ContentRequest;
  product?: Product;
  items: RankedPitch[];
  canHire: boolean;
  onBack: () => void;
  onHire: (pitchId: string) => void;
  onOpen: (pitchId: string) => void;
  onPlay: (pitchId: string, videoId: string) => void;
  onShortlist: (pitchId: string, on: boolean) => void;
}) {
  const many = items.length > 1;
  // The best on a line, only when one pitch is strictly best (a tie tags nobody).
  const pick = (score: (i: RankedPitch) => number, lowest: boolean) => {
    if (!many) return undefined;
    const values = items.map(score);
    const best = lowest ? Math.min(...values) : Math.max(...values);
    const winners = items.filter((i) => score(i) === best);
    return winners.length === 1 ? winners[0].pitch.id : undefined;
  };
  const lowest = pick((i) => i.pitch.price, true);
  const fastest = pick((i) => i.pitch.deliveryDays, true);
  const bestFit = pick((i) => i.fit.score, false);
  const bestRated = pick((i) => (i.creator.reviewCount ? i.creator.rating : 0), false);
  const mostOnTime = pick((i) => i.creator.onTimeRate, false);
  // One green: the first column (the current sort's top pitch) that can still be hired.
  const neonId = canHire ? items.find((i) => i.pitch.status === "shortlisted")?.pitch.id : undefined;

  return (
    <section aria-labelledby="compare-h" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h2 id="compare-h" className="y-head">
            Your shortlist, side by side
          </h2>
          <p className="y-small y-fg-2">Tags mark the best on each line.</p>
        </div>
        <PillButton variant="ghost" size="sm" icon={<ArrowLeft size={15} aria-hidden className="y-flip" />} onClick={onBack}>
          All pitches
        </PillButton>
      </div>

      <div className="oo-compare -mx-(--y-gutter) px-(--y-gutter) pb-2 md:mx-0 md:px-0" data-count={items.length}>
        {items.map((item) => {
          const { pitch, creator, fit } = item;
          const sample = pitch.sampleIds.map((id) => videoById(s, id)).find((v): v is Video => v !== undefined);
          const budget = budgetNote(pitch.price, request.budget);
          const delivery = deliveryInfo(pitch.deliveryDays, request, creator);
          const shortlisted = pitch.status === "shortlisted";
          const tags = fitTags(creator, request, product);
          return (
            <article key={pitch.id} data-tone="paper" className="oo-col y-block" aria-label={`${creator.name}'s pitch`}>
              <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
                <FaceAvatar id={creator.id} name="" size={36} />
                <div className="min-w-0 flex-1">
                  <p className="y-small flex items-center gap-1 font-semibold">
                    <span className="truncate">{creator.name}</span>
                    {creator.verified ? <BadgeCheck size={14} aria-label="ID verified" className="flex-none" /> : null}
                  </p>
                  <p className="y-micro y-fg-2 truncate">
                    {creatorKindById[creator.kind].name} · {cityById(creator.cityId)?.name}
                  </p>
                </div>
                {pitch.status !== "hired" ? (
                  <RoundIconButton
                    size="sm"
                    tone={shortlisted ? "contrast" : "soft"}
                    label={shortlisted ? `Remove ${creator.firstName} from your shortlist` : `Shortlist ${creator.firstName}`}
                    aria-pressed={shortlisted}
                    onClick={() => onShortlist(pitch.id, !shortlisted)}
                  >
                    <Star size={16} aria-hidden className={shortlisted ? "fill-current" : ""} />
                  </RoundIconButton>
                ) : null}
              </div>
              <div className="px-4 pb-3">
                {sample ? (
                  <button
                    type="button"
                    className="mx-auto block w-full max-w-[132px] rounded-(--y-r-tile)"
                    onClick={() => onPlay(pitch.id, sample.id)}
                    aria-label={`Play ${creator.firstName}'s sample: ${sample.title}`}
                  >
                    <VideoThumb video={sample} frame="9:16" playable showHook={false} showMeta={false} decorative />
                  </button>
                ) : (
                  <p className="y-micro y-fg-2">No sample attached</p>
                )}
              </div>
              <Cell label="The idea">
                <button type="button" className="text-start font-medium hover:underline" dir="auto" onClick={() => onOpen(pitch.id)}>
                  {quoted(pitch.angle)}
                </button>
              </Cell>
              <Cell label="Quote" best={lowest === pitch.id ? "Lowest" : undefined}>
                <PriceText price={pitch.price} request={request} className="y-head" />
                <span className={`y-micro block ${budget.over ? "text-(--y-warning)" : "y-fg-2"}`}>{budget.text}</span>
              </Cell>
              <Cell label="First version" best={fastest === pitch.id ? "Fastest" : undefined}>
                <DaysText item={item} request={request} className="font-semibold" />
                <span className="y-micro y-fg-2 block">
                  {delivery.startsOn ? `Starts ${weekdayDate(delivery.startsOn)}, ready ` : "By "}
                  {weekdayDate(delivery.date)}
                </span>
              </Cell>
              <Cell label="Fit" best={bestFit === pitch.id ? "Best fit" : undefined}>
                <span className="font-semibold">{fit.score}%</span>
                <span className="y-micro y-fg-2 block">{fit.gaps[0] ? `Gap: ${fit.gaps[0]}` : tags.join(", ")}</span>
              </Cell>
              <Cell label="Rating" best={bestRated === pitch.id && creator.reviewCount ? "Highest" : undefined}>
                <RatingOrNew creator={creator} count />
                <span className="y-micro y-fg-2 block">{creator.completed} done</span>
              </Cell>
              <Cell label="On time" best={mostOnTime === pitch.id ? "Most reliable" : undefined}>
                <span className="font-semibold">{creator.onTimeRate}%</span>
              </Cell>
              <div className="oo-cell flex flex-col gap-2 p-4">
                {canHire && pitch.status !== "hired" ? (
                  <PillButton
                    variant={neonId === pitch.id ? "neon" : "outline"}
                    className="w-full"
                    onClick={() => onHire(pitch.id)}
                    aria-label={`Hire ${creator.firstName}`}
                  >
                    Hire {creator.firstName}
                  </PillButton>
                ) : null}
                <PillButton variant="ghost" size="sm" className="w-full" onClick={() => onOpen(pitch.id)}>
                  Read the pitch
                </PillButton>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
