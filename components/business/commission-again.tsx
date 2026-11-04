"use client";

import { ArrowRight, Repeat2, Star } from "lucide-react";

import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { plural, shortDate } from "@/lib/format";
import { commissionTotals, pastCollaborators, productById } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { ME, useDemo } from "@/lib/store";

export type Collaborator = ReturnType<typeof pastCollaborators>[number];

/** Everything needed to offer "commission again": what carries forward, what you rated, spend. */
export function collaboratorInfo(s: DemoState, entry: Collaborator) {
  const { creator, last } = entry;
  const theirs = s.reviews
    .filter((r) => r.businessId === ME.businessId && r.creatorId === creator.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const review = theirs.find((r) => r.commissionId === last.id) ?? theirs[0];
  const product = productById(s, last.brief.productId);
  const learnings = product?.learnings.length ?? 0;
  const spent = s.commissions
    .filter(
      (c) =>
        c.businessId === ME.businessId &&
        c.creatorId === creator.id &&
        c.payment.status === "released",
    )
    .reduce((sum, c) => sum + commissionTotals(c).total, 0);
  return {
    review,
    product,
    learnings,
    spent,
    lastDate: last.completedAt ?? last.createdAt,
    repeatHref: `/creators/${creator.handle}/commission?repeat=${last.id}`,
    carry: product ? `Product context + ${plural(learnings, "learning")}` : "Your last brief carries over",
  };
}

/** "You rated 5" star chip (or a plain note when there's no rating). */
export function YourRating({ rating }: { rating?: number }) {
  if (!rating)
    return <span className="y-micro y-fg-2">Not rated yet</span>;
  return (
    <span
      className="y-small inline-flex flex-none items-center gap-1 font-semibold"
      aria-label={`You rated ${rating} out of 5`}
      title="Your rating"
    >
      <Star size={15} aria-hidden className="fill-current" />
      <span aria-hidden className="y-num">
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

/** Repeat business: people you've finished work with, one tap to book again. */
export function CommissionAgainBlock({ className = "", limit = 3 }: { className?: string; limit?: number }) {
  const s = useDemo();
  const people = pastCollaborators(s);

  return (
    <Block as="section" aria-labelledby="again-title" tone="night" pad="md" className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col gap-1">
        <h2 id="again-title" className="y-display y-title">
          Commission again
        </h2>
        <p className="y-small y-fg-2">
          Same creator, no new brief. Your product context and feedback go with it.
        </p>
      </div>

      {people.length ? (
        <ul className="flex flex-col gap-2">
          {people.slice(0, limit).map((entry) => {
            const info = collaboratorInfo(s, entry);
            return (
              <li key={entry.creator.id} className="y-tile flex flex-col gap-3 p-3">
                <div className="flex items-center gap-3">
                  <FaceAvatar id={entry.creator.id} name="" size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="y-small truncate font-semibold">{entry.creator.name}</p>
                    <p className="y-micro y-fg-2 truncate">
                      {entry.last.title} · {shortDate(info.lastDate)}
                    </p>
                  </div>
                  <YourRating rating={info.review?.rating} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="y-micro y-fg-2 inline-flex items-center gap-1.5">
                    <Repeat2 size={14} aria-hidden /> {info.carry}
                  </span>
                  <PillButton
                    href={info.repeatHref}
                    variant="contrast"
                    size="sm"
                    aria-label={`Commission ${entry.creator.firstName} again`}
                  >
                    Commission again
                  </PillButton>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="y-tile y-small y-fg-2 p-4">
          When a commission is finished, the creator appears here so you can book them again with
          everything they learned.
        </p>
      )}

      <PillButton
        href="/business/creators?tab=worked"
        variant="ghost"
        size="sm"
        className="mt-auto self-start !ps-0"
        icon={<ArrowRight size={16} aria-hidden className="y-flip order-last" />}
      >
        All your creators
      </PillButton>
    </Block>
  );
}
