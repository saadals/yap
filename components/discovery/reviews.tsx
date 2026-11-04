"use client";

import { MessageSquareReply, ThumbsUp } from "lucide-react";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { FormatChip } from "@/components/domain/chips";
import { StarRow } from "@/components/domain/stars";
import { Block } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";
import { daysFromNow, monthYearOf, num, plural, timeAgo } from "@/lib/format";
import { businessById, reviewsForCreator } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import type { Creator, Review } from "@/lib/types";

const INITIAL = 3;

function avg(list: Review[], pick: (r: Review) => number) {
  return list.length ? list.reduce((sum, r) => sum + pick(r), 0) / list.length : 0;
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="y-small w-28 flex-none">{label}</span>
      <span
        className="relative block h-2 flex-1 overflow-hidden rounded-full bg-(--b-line)"
        role="img"
        aria-label={`${label}: ${value.toFixed(1)} out of 5`}
      >
        <span
          className="absolute inset-y-0 start-0 rounded-full bg-(--b-fg)"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </span>
      <span className="y-small y-num w-8 flex-none text-end font-semibold" aria-hidden>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

const when = (iso: string) => (daysFromNow(iso) > -30 ? timeAgo(iso) : monthYearOf(iso));

export function ReviewsBlock({ s, creator }: { s: DemoState; creator: Creator }) {
  const reviews = reviewsForCreator(s, creator.id);
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? reviews : reviews.slice(0, INITIAL);
  const rehire = reviews.length
    ? Math.round((reviews.filter((r) => r.wouldRehire).length / reviews.length) * 100)
    : 0;

  return (
    <Block tone="paper" pad="md" className="flex scroll-mt-24 flex-col gap-6" id="reviews" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="y-display y-title">
        Reviews
      </h2>

      {reviews.length === 0 ? (
        <p className="y-body y-fg-2 max-w-[62ch]">
          No written reviews yet. {creator.firstName} has completed {plural(creator.completed, "commission")}{" "}
          with a {creator.rating.toFixed(1)} average rating from earlier clients.
        </p>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-10">
            <div className="flex flex-col gap-1.5">
              <span className="y-display y-num text-[56px] leading-none font-semibold tracking-[-0.04em]">
                {creator.rating.toFixed(1)}
              </span>
              <StarRow value={creator.rating} size={18} />
              <span className="y-small y-fg-2">{plural(creator.reviewCount, "review")}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              <Bar label="Quality" value={avg(reviews, (r) => r.quality)} />
              <Bar label="Communication" value={avg(reviews, (r) => r.communication)} />
              <Bar label="Timeliness" value={avg(reviews, (r) => r.timeliness)} />
              <span className="y-micro y-fg-3">From the {plural(reviews.length, "most recent review")}</span>
            </div>
            <div className="y-tile flex flex-col gap-1 p-4 md:min-w-40">
              <span className="y-display y-num inline-flex items-center gap-2 text-[36px] leading-none font-semibold tracking-[-0.04em]">
                <ThumbsUp aria-hidden className="size-7" />
                {rehire}%
              </span>
              <span className="y-small y-fg-2">would hire again</span>
            </div>
          </div>

          <ul className="flex flex-col gap-2">
            {shown.map((review) => {
              const business = businessById(s, review.businessId);
              return (
                <li key={review.id} className="y-tile flex flex-col gap-3 p-5">
                  <div className="flex items-start gap-3">
                    {business ? <BusinessLogo business={business} size={40} /> : null}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="y-small font-semibold">
                        {review.authorName}
                        <span className="y-fg-2 font-normal">
                          {" "}
                          · {review.authorTitle}
                          {business ? `, ${business.name}` : ""}
                        </span>
                      </span>
                      <span className="y-micro y-fg-2 flex flex-wrap items-center gap-x-2">
                        <StarRow value={review.rating} size={13} />
                        <span>{when(review.createdAt)}</span>
                      </span>
                    </div>
                    <FormatChip id={review.format} className="hidden !bg-(--b-bg) sm:inline-flex" />
                  </div>
                  <p className="y-body max-w-[66ch]">{review.text}</p>
                  <FormatChip id={review.format} className="w-fit !bg-(--b-bg) sm:hidden" />
                  {review.reply ? (
                    <div className="flex gap-2.5 border-s-2 border-(--b-fg) ps-4">
                      <MessageSquareReply size={16} aria-hidden className="mt-0.5 flex-none" />
                      <p className="y-small">
                        <span className="font-semibold">Reply from {creator.firstName}: </span>
                        <span className="y-fg-2">{review.reply}</span>
                      </p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {reviews.length > INITIAL ? (
            <PillButton variant="outline" className="w-fit" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
              {expanded ? "Show fewer reviews" : `Show all ${num(reviews.length)} written reviews`}
            </PillButton>
          ) : null}
        </>
      )}
    </Block>
  );
}
