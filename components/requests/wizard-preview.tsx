"use client";

import { Clock, Eye, Lock, Mic } from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { languageList, platformList } from "@/components/domain/chips";
import { VideoThumb } from "@/components/domain/video-thumb";
import { Block } from "@/components/ui/block";
import { AvatarStack } from "@/components/ui/face-avatar";
import { Ar } from "@/components/ui/page";
import { compact, lengthLabel, moneyRange, plural, weekdayDate } from "@/lib/format";
import { ME, type DemoState } from "@/lib/store";
import { formatById, isArabic } from "@/lib/taxonomy";
import type { FormatId, Product } from "@/lib/types";

import { deliverableLabel, dueDateFor, effectiveTitle, exampleVideo, typicalLength, type Market, type WizardForm } from "./shared";

/** What creators will see in their feed, updated as the business answers. */
export function RequestPreview({
  s,
  form,
  product,
  market,
}: {
  s: DemoState;
  form: WizardForm;
  product?: Product;
  market: Market;
}) {
  const business = s.businesses.find((b) => b.id === ME.businessId);
  const format = form.format ? formatById[form.format] : undefined;
  const FormatIcon = format?.icon;
  const title = effectiveTitle(form, product);
  return (
    <Block as="section" tone="paper" pad="md" className="flex flex-col gap-4" aria-label="Preview of your request">
      <div className="flex items-start gap-3">
        {business ? <BusinessLogo business={business} size={44} /> : null}
        <div className="min-w-0 flex-1">
          <p className="y-micro y-fg-2">
            <span className="font-semibold text-(--b-fg)">{business?.name}</span>
            {product ? ` · ${product.name}` : ""} · Posted just now
          </p>
          <p className={`y-head mt-1 ${title ? "" : "y-fg-3"}`}>{title || "Your title appears here"}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {form.visibility === "invite" ? (
          <span className="y-chip">
            <Lock size={14} aria-hidden /> Invite only
          </span>
        ) : null}
        {format && FormatIcon ? (
          <span className="y-chip">
            <FormatIcon size={14} aria-hidden /> {format.name}
          </span>
        ) : (
          <span className="y-chip y-fg-3">Format</span>
        )}
        <span className="y-chip">
          {deliverableLabel(form.format, form.videoCount)} · {lengthLabel(form.durationSec)}
        </span>
        {form.languages.length ? <span className="y-chip">{languageList(form.languages)}</span> : null}
        {form.platforms.length ? <span className="y-chip">{platformList(form.platforms)}</span> : null}
        {!form.onCamera ? (
          <span className="y-chip">
            <Mic size={14} aria-hidden /> Voiceover
          </span>
        ) : null}
      </div>
      {form.keyMessage.trim() ? (
        <p className="y-display text-[20px] leading-snug">&ldquo;{form.keyMessage.trim()}&rdquo;</p>
      ) : (
        <p className="y-small y-fg-3">Your key message shows here once you write it.</p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-(--b-line) pt-4">
        <div>
          <p className="y-micro y-fg-2">Budget</p>
          <p className="y-display y-num text-[24px] leading-tight font-semibold tracking-[-0.02em]">
            {moneyRange(form.budget.min, form.budget.max)}
          </p>
        </div>
        {Number.isFinite(form.dueInDays) ? (
          <span className="y-micro y-fg-2 inline-flex items-center gap-1">
            <Clock size={13} aria-hidden /> Due {weekdayDate(dueDateFor(form.dueInDays))}
          </span>
        ) : null}
      </div>
      <div className="y-tile flex items-center gap-3 p-3">
        {market.count ? (
          <AvatarStack size={28} max={5} people={market.pool.map((q) => ({ id: q.creator.id, name: q.creator.name }))} />
        ) : null}
        <p className="y-micro" aria-live="polite">
          <span className="font-semibold">
            {market.count ? `${plural(market.count, "creator")} ${market.count === 1 ? "matches" : "match"}` : "No matches yet"}
          </span>
          <span className="y-fg-2 block">
            {form.visibility === "invite"
              ? `Only the ${plural(form.invitedCreatorIds.length, "creator")} you invite will see it`
              : "Everyone who matches will see it"}
          </span>
        </p>
      </div>
    </Block>
  );
}

/** A real piece from the marketplace in the focused format. */
export function FormatExample({
  s,
  format,
  languages,
}: {
  s: DemoState;
  format: FormatId | null;
  languages: WizardForm["languages"];
}) {
  const video = exampleVideo(s, format, languages);
  if (!format || !video) {
    return (
      <Block tone="paper" pad="md" className="flex flex-col gap-2">
        <p className="y-head">See an example</p>
        <p className="y-small y-fg-2">Hover or pick a format to see a real video made on Yapp.</p>
      </Block>
    );
  }
  const info = formatById[format];
  const creator = s.creators.find((c) => c.id === video.creatorId);
  return (
    <Block tone="paper" pad="md" className="flex flex-col gap-4" aria-live="polite">
      <div>
        <p className="y-micro y-fg-2">Example {info.name.toLowerCase()}</p>
        <p className="y-head">{video.title}</p>
      </div>
      <div className="grid grid-cols-[148px_1fr] gap-4">
        <VideoThumb video={video} frame="9:16" />
        <div className="flex min-w-0 flex-col gap-3">
          <div>
            <p className="y-micro y-fg-2">Hook</p>
            {isArabic(video.lang) ? (
              <Ar as="p" className="y-display text-[18px] font-semibold">
                {video.hook}
              </Ar>
            ) : (
              <p className="y-display text-[18px] font-semibold">{video.hook}</p>
            )}
            {video.hookTranslation ? <p className="y-micro y-fg-2 mt-1">&ldquo;{video.hookTranslation}&rdquo;</p> : null}
          </div>
          <ol className="flex flex-col gap-1">
            {info.beats.map((beat, index) => (
              <li key={beat} className="y-micro flex items-center gap-2">
                <span className="y-num grid size-5 flex-none place-items-center rounded-full bg-(--b-chip) font-semibold">
                  {index + 1}
                </span>
                {beat}
              </li>
            ))}
          </ol>
          <p className="y-micro y-fg-2 mt-auto">
            {creator ? `By ${creator.name}` : ""}
            {video.madeFor ? ` for ${video.madeFor}` : ""}
            {video.stats ? (
              <span className="mt-1 flex items-center gap-1">
                <Eye size={13} aria-hidden /> {compact(video.stats.views)} views
                {video.stats.watchThroughPct ? ` · ${video.stats.watchThroughPct}% watched through` : ""}
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <p className="y-micro y-fg-3">Usually {typicalLength(format)}.</p>
    </Block>
  );
}
