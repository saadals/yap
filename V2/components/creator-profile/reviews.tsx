"use client";

import { MessageSquareReply } from "lucide-react";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { StarRow } from "@/components/domain/stars";
import { Block } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { daysFromNow, monthYearOf, num, plural, timeAgo } from "@/lib/format";
import { businessById, reviewsForCreator } from "@/lib/selectors";
import { actions, type DemoState } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { Creator, Review } from "@/lib/types";

const INITIAL = 3;

const avg = (list: Review[], pick: (r: Review) => number) =>
  list.length ? list.reduce((sum, r) => sum + pick(r), 0) / list.length : 0;

const when = (iso: string) => (daysFromNow(iso) > -30 ? timeAgo(iso) : monthYearOf(iso));

/**
 * The rating, what written reviews add (would hire again, the three scores), the latest three,
 * and "Show all". The creator on their own profile can reply to a review publicly.
 */
export function ReviewsBlock({ s, creator, own }: { s: DemoState; creator: Creator; own: boolean }) {
  const reviews = reviewsForCreator(s, creator.id);
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? reviews : reviews.slice(0, INITIAL);
  const rehire = reviews.length ? Math.round((reviews.filter((r) => r.wouldRehire).length / reviews.length) * 100) : 0;

  return (
    <Block tone="paper" pad="md" className="flex scroll-mt-24 flex-col gap-4" id="reviews" aria-labelledby="reviews-heading">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <h2 id="reviews-heading" className="y-display y-title">
          Reviews
        </h2>
        {reviews.length ? (
          <dl className="y-small y-fg-2 flex flex-wrap gap-x-4 gap-y-1">
            <div className="flex gap-1">
              <dt className="sr-only">Would hire again</dt>
              <dd>
                <span className="y-num font-semibold text-(--b-fg)">{rehire}%</span> would hire again
              </dd>
            </div>
            {(
              [
                ["Quality", (r: Review) => r.quality],
                ["Communication", (r: Review) => r.communication],
                ["Timeliness", (r: Review) => r.timeliness],
              ] as const
            ).map(([label, pick]) => (
              <div key={label} className="flex gap-1">
                <dt>{label}</dt>
                <dd className="y-num font-semibold text-(--b-fg)">{avg(reviews, pick).toFixed(1)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {reviews.length === 0 ? (
        <p className="y-body y-fg-2 max-w-[62ch]">
          {creator.completed
            ? `No written reviews yet. ${creator.firstName} has completed ${plural(creator.completed, "job")} with a ${creator.rating.toFixed(1)} average rating from earlier clients.`
            : `No reviews yet. ${creator.firstName} is new on Yapp; reviews appear here after their first job.`}
        </p>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-(--b-line)">
            {shown.map((review) => {
              const business = businessById(s, review.businessId);
              return (
                <li key={review.id} className="flex flex-col gap-2.5 py-4 first:pt-1">
                  <div className="flex items-start gap-3">
                    {business ? <BusinessLogo business={business} size={36} /> : null}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="y-small font-medium">
                        {review.authorName}
                        <span className="y-fg-2 font-normal">
                          {" "}
                          · {review.authorTitle}
                          {business ? `, ${business.name}` : ""}
                        </span>
                      </span>
                      <span className="y-micro y-fg-2 flex flex-wrap items-center gap-x-2">
                        <StarRow value={review.rating} size={12} />
                        <span>
                          {when(review.createdAt)} · {formatById[review.format].name}
                        </span>
                      </span>
                    </div>
                  </div>
                  <p className="y-body max-w-[66ch]">{review.text}</p>
                  {review.reply ? (
                    <div className="flex gap-2.5 border-s-2 border-(--b-line) ps-4">
                      <MessageSquareReply size={15} aria-hidden className="mt-0.5 flex-none" />
                      <p className="y-small">
                        <span className="font-medium">Reply from {creator.firstName}: </span>
                        <span className="y-fg-2">{review.reply}</span>
                      </p>
                    </div>
                  ) : own ? (
                    <ReplyToReview review={review} />
                  ) : null}
                </li>
              );
            })}
          </ul>
          {reviews.length > INITIAL ? (
            <PillButton
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
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
        className="y-small y-fg-2 inline-flex min-h-11 w-fit items-center gap-1.5 font-medium hover:text-(--b-fg)"
      >
        <MessageSquareReply size={15} aria-hidden /> Reply publicly
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
