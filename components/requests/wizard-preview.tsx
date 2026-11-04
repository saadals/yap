"use client";

import { Eye } from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { languageList, platformList } from "@/components/domain/chips";
import { Block } from "@/components/ui/block";
import { lengthLabel, moneyRange, plural, weekdayDate } from "@/lib/format";
import { ME, type DemoState } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { Product } from "@/lib/types";

import { deliverableLabel, dueDateFor, effectiveTitle, type Market, type WizardForm } from "./shared";

/** What creators will see in their feed, updated as the business answers. Compact on purpose. */
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
  const title = effectiveTitle(form, product);
  const meta = [
    form.visibility === "invite" ? "Invite only" : null,
    format?.name,
    `${deliverableLabel(form.format, form.videoCount)} · ${lengthLabel(form.durationSec)}`,
    form.languages.length ? languageList(form.languages) : null,
    form.platforms.length ? platformList(form.platforms) : null,
    form.onCamera ? null : "Voiceover",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Block as="section" tone="paper" pad="md" className="flex flex-col gap-4" aria-labelledby="preview-h">
      <h2 id="preview-h" className="y-micro y-fg-2 flex items-center gap-1.5">
        <Eye size={14} aria-hidden /> Live preview · what creators see
      </h2>
      <div className="flex items-start gap-3">
        {business ? <BusinessLogo business={business} size={40} /> : null}
        <div className="min-w-0 flex-1">
          <p className="y-micro y-fg-2">
            {business?.name}
            {product ? ` · ${product.name}` : ""}
          </p>
          <p className={`y-head ${title ? "" : "y-fg-3"}`}>{title || "Your title appears here"}</p>
          <p className="y-small y-fg-2 mt-1">{meta}</p>
        </div>
      </div>
      {form.keyMessage.trim() ? (
        <p className="y-display text-[18px] leading-snug">&ldquo;{form.keyMessage.trim()}&rdquo;</p>
      ) : null}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-(--b-line) pt-4">
        <p className="y-display y-num text-[20px] font-semibold tracking-[-0.02em]">
          {moneyRange(form.budget.min, form.budget.max)}
        </p>
        {Number.isFinite(form.dueInDays) ? (
          <p className="y-micro y-fg-2">Due {weekdayDate(dueDateFor(form.dueInDays))}</p>
        ) : null}
      </div>
      <p className="y-micro y-fg-2" aria-live="polite">
        {form.visibility === "invite"
          ? `Only the ${plural(form.invitedCreatorIds.length, "creator")} you invite will see it.`
          : market.count
            ? `${plural(market.count, "creator")} ${market.count === 1 ? "matches" : "match"}. Everyone who matches will see it.`
            : "No matches yet."}
      </p>
    </Block>
  );
}
