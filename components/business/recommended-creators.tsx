"use client";

import { ArrowRight, MailPlus } from "lucide-react";

import { CreatorRow, SaveCreatorButton } from "@/components/domain/creator-card";
import { Block } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import {
  commissionsForBusiness,
  fit,
  pitchesForRequest,
  productById,
  requestsForBusiness,
} from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { ME, actions, useDemo } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { ContentRequest } from "@/lib/types";

/**
 * What to match creators against: the latest open request, or (with none open) a request shaped
 * like the most recent commission's brief for the main product.
 */
function matchTarget(s: DemoState): { request: ContentRequest; label: string; real: boolean } | null {
  const open = requestsForBusiness(s).find((r) => r.status === "open");
  if (open) return { request: open, label: open.title, real: true };
  const recent = commissionsForBusiness(s).find((c) => productById(s, c.brief.productId));
  if (!recent) return null;
  const product = productById(s, recent.brief.productId);
  const request: ContentRequest = {
    id: "match-preview",
    businessId: ME.businessId,
    title: product?.name ?? recent.title,
    brief: recent.brief,
    budget: { min: Math.round(recent.price * 0.8), max: Math.round(recent.price * 1.25) },
    dueDate: recent.dueDate,
    postedAt: recent.createdAt,
    status: "open",
    visibility: "public",
    invitedCreatorIds: [],
    preferredKinds: [],
    slots: 1,
    views: 0,
  };
  return {
    request,
    label: `${product?.name ?? "your product"} ${formatById[recent.brief.format].name.toLowerCase()}s`,
    real: false,
  };
}

/** Lavender = match. Top creators for your latest request, with reasons and a Save heart. */
export function RecommendedCreators({ className = "", limit = 4 }: { className?: string; limit?: number }) {
  const s = useDemo();
  const toast = useToast();
  const target = matchTarget(s);
  const pitched = target ? new Set(pitchesForRequest(s, target.request.id).map((p) => p.creatorId)) : new Set<string>();
  const ranked = target
    ? s.creators
        .filter((c) => !pitched.has(c.id) && !target.request.invitedCreatorIds.includes(c.id))
        .map((creator) => ({ creator, fit: fit(s, creator, target.request) }))
        .sort((a, b) => b.fit.score - a.fit.score || b.creator.rating - a.creator.rating)
        .slice(0, limit)
    : [];

  return (
    <Block as="section" aria-labelledby="recommended-title" tone="lavender" pad="md" className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col gap-1">
        <h2 id="recommended-title" className="y-display y-title">
          Good fits for you
        </h2>
        <p className="y-small y-fg-2">
          {target
            ? `Matched to “${target.label}” on dialect, format and niche. Not yet ${target.real ? "pitching or invited" : "hired by you"}.`
            : "Add a product and post a request to get matches."}
        </p>
      </div>

      {ranked.length ? (
        <ul className="flex flex-col gap-1">
          {ranked.map(({ creator, fit: match }) => (
            <li key={creator.id} className="border-t border-(--b-line) pt-2 first:border-t-0 first:pt-0">
              <CreatorRow
                creator={creator}
                meta={match.reasons.slice(0, 2).join(" · ") || creator.headline}
                action={
                  <span className="flex flex-none items-center gap-2">
                    <span className="flex flex-col items-end leading-none" aria-label={`${match.score}% fit`}>
                      <span aria-hidden className="y-display y-num text-[22px] font-semibold tracking-[-0.02em]">
                        {match.score}
                        <span className="text-sm">%</span>
                      </span>
                      <span aria-hidden className="y-micro y-fg-2">
                        fit
                      </span>
                    </span>
                    <SaveCreatorButton creator={creator} variant="soft" />
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2">
        {target?.real && ranked.length ? (
          <PillButton
            variant="contrast"
            size="sm"
            icon={<MailPlus size={16} aria-hidden />}
            onClick={() => {
              for (const { creator } of ranked) actions.inviteToRequest(target.request.id, creator.id);
              toast({
                message: `Invited ${ranked.length === 1 ? ranked[0].creator.firstName : `${ranked.length} creators`} to pitch on “${target.request.title}”`,
              });
            }}
          >
            {ranked.length === 1 ? `Invite ${ranked[0].creator.firstName} to pitch` : `Invite these ${ranked.length} to pitch`}
          </PillButton>
        ) : null}
        <PillButton
          href="/creators"
          variant="ghost"
          size="sm"
          icon={<ArrowRight size={16} aria-hidden className="y-flip order-last" />}
        >
          Browse all creators
        </PillButton>
      </div>
    </Block>
  );
}
