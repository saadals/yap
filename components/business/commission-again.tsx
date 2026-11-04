"use client";

import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { plural, shortDate } from "@/lib/format";
import { commissionTotals, pastCollaborators, productById } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { ME, useDemo } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";

import { BlockHeader } from "./in-progress";

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

/** Repeat business: people you've finished work with, one tap to book again. */
export function CommissionAgainBlock({ className = "", limit = 3 }: { className?: string; limit?: number }) {
  const s = useDemo();
  const people = pastCollaborators(s);

  return (
    <Block as="section" aria-labelledby="again-title" tone="paper" pad="md" className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-col gap-1">
        <BlockHeader id="again-title" title="Commission again" href="/business/creators?tab=worked" linkLabel="All" />
        <p className="y-small y-fg-2">No new brief. Your product context and learnings go with it.</p>
      </div>

      {people.length ? (
        <ul className="flex flex-col">
          {people.slice(0, limit).map((entry) => {
            const info = collaboratorInfo(s, entry);
            return (
              <li key={entry.creator.id} className="flex items-center gap-3 py-2.5">
                <FaceAvatar id={entry.creator.id} name="" size={40} />
                <div className="min-w-0 flex-1">
                  <p className="y-body truncate font-semibold">{entry.creator.name}</p>
                  <p className="y-micro y-fg-2 truncate">
                    {formatById[entry.last.brief.format].name}
                    <span className="hidden sm:inline"> · {shortDate(info.lastDate)}</span>
                  </p>
                </div>
                <PillButton
                  href={info.repeatHref}
                  variant="outline"
                  size="sm"
                  aria-label={`Commission ${entry.creator.firstName} again`}
                >
                  Commission again
                </PillButton>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="y-small y-fg-2">
          When a commission is finished, the creator appears here so you can book them again.
        </p>
      )}
    </Block>
  );
}
