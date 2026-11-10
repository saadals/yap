"use client";

import { MessageSquareReply } from "lucide-react";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { StarRow } from "@/components/domain/stars";
import { Block } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { daysFromNow, monthYearOf, num, plural, timeAgo } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { businessById, me, reviewsForCreator } from "@/lib/selectors";
import { actions, type DemoState } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { Creator, Review } from "@/lib/types";

const INITIAL = 3;

function avg(list: Review[], pick: (r: Review) => number) {
  return list.length ? list.reduce((sum, r) => sum + pick(r), 0) / list.length : 0;
}

const when = (iso: string) => (daysFromNow(iso) > -30 ? timeAgo(iso) : monthYearOf(iso));

export function ReviewsBlock({ s, creator }: { s: DemoState; creator: Creator }) {
  const reviews = reviewsForCreator(s, creator.id);
  const [expanded, setExpanded] = useState(false);
  const { account } = usePrefs();
  // The creator viewing their own public profile can answer reviews publicly.
  const canReply = Boolean(account) && me.creator(s)?.id === creator.id;
  const shown = expanded ? reviews : reviews.slice(0, INITIAL);
  const rehire = reviews.length
    ? Math.round((reviews.filter((r) => r.wouldRehire).length / reviews.length) * 100)
    : 0;
  // The overall rating and count sit in the hero; here only what the written reviews add.
  const summary = reviews.length
    ? [
        `${rehire}% would hire again`,
        `Quality ${avg(reviews, (r) => r.quality).toFixed(1)}`,
        `Communication ${avg(reviews, (r) => r.communication).toFixed(1)}`,
        `Timeliness ${avg(reviews, (r) => r.timeliness).toFixed(1)}`,
      ].join(" · ")
    : null;

  return (
    <Block tone="paper" pad="md" className="flex scroll-mt-24 flex-col gap-4" id="reviews" aria-labelledby="reviews-heading">
      <div className="flex flex-col gap-1">
        <h2 id="reviews-heading" className="y-display y-title">
          Reviews
        </h2>
        {summary ? <p className="y-small y-fg-2">{summary}</p> : null}
      </div>

      {reviews.length === 0 ? (
        <p className="y-body y-fg-2 max-w-[62ch]">
          No written reviews yet. {creator.firstName} has completed {plural(creator.completed, "commission")}{" "}
          with a {creator.rating.toFixed(1)} average rating from earlier clients.
        </p>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-(--b-line)">
            {shown.map((review) => {
              const business = businessById(s, review.businessId);
              return (
                <li key={review.id} className="flex flex-col gap-3 py-5 first:pt-1">
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
                        <span>
                          {when(review.createdAt)} · {formatById[review.format].name}
                        </span>
                      </span>
                    </div>
                  </div>
                  <p className="y-body max-w-[66ch]">{review.text}</p>
                  {review.reply ? (
                    <div className="flex gap-2.5 border-s-2 border-(--b-line) ps-4">
                      <MessageSquareReply size={16} aria-hidden className="mt-0.5 flex-none" />
                      <p className="y-small">
                        <span className="font-semibold">Reply from {creator.firstName}: </span>
                        <span className="y-fg-2">{review.reply}</span>
                      </p>
                    </div>
                  ) : canReply ? (
                    <ReplyToReview review={review} />
                  ) : null}
                </li>
              );
            })}
          </ul>
          {reviews.length > INITIAL ? (
            <PillButton variant="outline" size="sm" className="w-fit" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
              {expanded ? "Show fewer" : `Show all ${num(reviews.length)} reviews`}
            </PillButton>
          ) : null}
        </>
      )}
    </Block>
  );
}

function ReplyToReview({ review }: { review: Review }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="y-small y-fg-2 inline-flex w-fit items-center gap-1.5 font-semibold hover:text-(--b-fg)"
      >
        <MessageSquareReply size={16} aria-hidden /> Reply publicly
      </button>
    );
  }
  return (
    <form
      className="flex flex-col gap-2 border-s-2 border-(--b-line) ps-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim().length < 2) return;
        actions.replyToReview(review.id, text.trim());
        toast({ message: "Reply posted on your profile" });
      }}
    >
      <label className="y-label" htmlFor={`reply-${review.id}`}>
        Your reply
      </label>
      <textarea
        id={`reply-${review.id}`}
        rows={2}
        className="y-input"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={`Thanks ${review.authorName.split(" ")[0]}, …`}
      />
      <div className="flex gap-2">
        <PillButton type="submit" variant="contrast" size="sm" disabled={text.trim().length < 2}>
          Post reply
        </PillButton>
        <PillButton variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </PillButton>
      </div>
    </form>
  );
}
