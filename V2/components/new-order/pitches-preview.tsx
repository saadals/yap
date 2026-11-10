"use client";

import { Eye, History, Paperclip } from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { languageList, platformList } from "@/components/domain/chips";
import { VideoThumb } from "@/components/domain/video-thumb";
import { Block } from "@/components/ui/block";
import { AvatarStack } from "@/components/ui/face-avatar";
import { lengthLabel, moneyRange, plural, quoted } from "@/lib/format";
import { me } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { formatById, jobTypeById, usageById } from "@/lib/taxonomy";
import type { Product, Video } from "@/lib/types";

import { deliverableLabel, effectiveTitle, isAdCopyForm, totalBudget, type Market, type PitchesForm } from "./pitches-model";

/** Videos by matching creators in the chosen format: what "good" looks like for this order. */
function examples(s: DemoState, form: PitchesForm, market: Market): Video[] {
  if (!form.format || isAdCopyForm(form)) return [];
  const ids = new Set(market.pool.map((q) => q.creator.id));
  return s.videos.filter((v) => ids.has(v.creatorId) && v.format === form.format).slice(0, 3);
}

/** What creators will see, updated as the brand answers (desktop rail). */
export function PitchesPreview({
  s,
  form,
  product,
  market,
}: {
  s: DemoState;
  form: PitchesForm;
  product?: Product;
  market: Market;
}) {
  const business = me.business(s);
  const adCopy = isAdCopyForm(form);
  const format = form.format ? formatById[form.format] : undefined;
  const title = effectiveTitle(form, product);
  const total = totalBudget(form);
  const learnings = product?.learnings.filter((l) => form.learningIds.includes(l.id)).length ?? 0;
  const meta = (
    adCopy
      ? [
          jobTypeById["ad-copy"].name,
          form.copyPieces.length ? plural(form.copyPieces.length, "piece") : null,
          form.languages.length ? languageList(form.languages) : null,
          form.copyPlacements.length ? platformList(form.copyPlacements) : null,
        ]
      : [
          format?.name,
          `${deliverableLabel(form)} · ${lengthLabel(form.durationSec)}`,
          form.languages.length ? languageList(form.languages) : null,
          form.platforms.length ? platformList(form.platforms) : null,
          form.onCamera ? null : "Voice only",
        ]
  )
    .filter(Boolean)
    .join(" · ");
  const videos = examples(s, form, market);
  const invited = form.invitedCreatorIds.length;
  const line = form.hook.trim() || form.keyMessage.trim();

  return (
    <>
      <Block as="section" tone="paper" pad="md" className="flex flex-col gap-4" aria-labelledby="preview-h">
        <h2 id="preview-h" className="y-micro y-fg-2 flex items-center gap-1.5">
          <Eye size={14} aria-hidden /> What creators see
        </h2>
        <div className="flex items-start gap-3">
          <BusinessLogo business={business} size={40} />
          <div className="min-w-0 flex-1">
            <p className="y-micro y-fg-2">
              {business.name}
              {product && product.name !== business.name ? ` · ${product.name}` : ""}
            </p>
            <p className={`y-head ${title ? "" : "y-fg-2"}`}>{title || "Your title appears here"}</p>
            <p className="y-small y-fg-2 mt-1">{meta}</p>
          </div>
        </div>
        {line ? <p className="y-body leading-snug">{quoted(line)}</p> : null}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-(--b-line) pt-4">
          <p className="y-display y-num text-[20px]">{moneyRange(total.min, total.max)}</p>
          <p className="y-micro y-fg-2">
            {plural(form.deadlineDays, "day")} to deliver · {usageById[form.usage].name}
          </p>
        </div>
        {learnings || form.attachments.length ? (
          <div className="flex flex-col gap-1">
            {learnings ? (
              <p className="y-micro y-fg-2 flex items-center gap-1.5">
                <History size={14} aria-hidden /> {plural(learnings, "learning")} from past work attached
              </p>
            ) : null}
            {form.attachments.length ? (
              <p className="y-micro y-fg-2 flex items-center gap-1.5">
                <Paperclip size={14} aria-hidden /> {plural(form.attachments.length, "file")} attached
              </p>
            ) : null}
          </div>
        ) : null}
      </Block>

      {videos.length ? (
        <Block as="section" tone="paper" pad="md" className="flex flex-col gap-3" aria-labelledby="examples-h">
          <h2 id="examples-h" className="y-micro y-fg-2">
            {format?.name} videos by creators who match
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {videos.map((video) => (
              <VideoThumb key={video.id} video={video} frame="9:16" showMeta={false} decorative />
            ))}
          </div>
        </Block>
      ) : null}

      <Block tone="paper" pad="md" className="flex items-center gap-3" aria-live="polite">
        {market.count ? (
          <AvatarStack size={28} max={4} people={market.pool.map((q) => ({ id: q.creator.id, name: q.creator.name }))} />
        ) : null}
        <p className="y-small min-w-0 flex-1">
          {form.visibility === "invite"
            ? `Only the ${plural(invited, "creator")} you invite will see it.`
            : market.count
              ? `${plural(market.count, "creator")} ${market.count === 1 ? "matches" : "match"} so far.`
              : adCopy
                ? "No creators write in that language yet. Try another one."
                : "No creators match yet. Try another language or format."}
        </p>
      </Block>
    </>
  );
}
