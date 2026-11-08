"use client";

import { Film, MailOpen } from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { languageList } from "@/components/domain/chips";
import { PillButton } from "@/components/ui/pill-button";
import { clock, dueLabel, money, moneyRange, plural } from "@/lib/format";
import { hashString, pickBy } from "@/lib/hash";
import type { IneligibleReason } from "@/lib/selectors";
import { businessById } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { campaignPlatformById, formatById, requestStatus, tierById } from "@/lib/taxonomy";
import type { Business, ContentRequest } from "@/lib/types";

import type { CampaignItem, OrderItem } from "./feed-items";
import { reelGradient, reelHref, reelLabel } from "./feed-items";
import { ReelFrame, type ReelProps } from "./reel-frame";
import { ReelMenu } from "./reel-menu";

type Pill = { label: string; neon: boolean; ariaLabel?: string };

/** A custom request as a reel: what they want, the budget, and Pitch. */
export function OrderReel({ item, reducedMotion, onOpen, position, setSize }: ReelProps<OrderItem>) {
  const s = useDemo();
  const { request, own } = item;
  const business = businessById(s, request.businessId);
  const open = request.status === "open";
  const due = dueLabel(request.dueDate);
  const pill: Pill = own
    ? { label: "Manage", neon: false }
    : !open
      ? { label: "See details", neon: false }
      : item.pitch
        ? { label: "See your pitch", neon: false }
        : { label: "Pitch", neon: true, ariaLabel: `Pitch on ${request.title}` };

  return (
    <GradientReel
      item={item}
      business={business}
      kindLabel="Custom order"
      pill={pill}
      reducedMotion={reducedMotion}
      onOpen={onOpen}
      position={position}
      setSize={setSize}
      facts={
        <div className="flex flex-col gap-1.5">
          <p className="flex items-baseline gap-2">
            <span className="y-display y-num y-reel-big font-semibold">
              {moneyRange(request.budget.min, request.budget.max)}
            </span>
            <span className="y-small font-semibold">budget</span>
          </p>
          <p className="y-small font-semibold">
            {formatById[request.brief.format]?.name} · {languageList(request.brief.languages)}
          </p>
          <p className="y-small font-semibold">
            {open ? due.text : requestStatus[request.status].label} ·{" "}
            {item.pitchCount ? plural(item.pitchCount, "pitch", "pitches") : "No pitches yet"}
          </p>
          {item.invited && !own ? (
            <span className="y-reel-chip mt-1 self-start">
              <MailOpen size={14} aria-hidden /> Invited you
            </span>
          ) : null}
        </div>
      }
    />
  );
}

const reasonLine: Partial<Record<IneligibleReason, (platform: string) => string>> = {
  joined: () => "You have a yapp on this one",
  excluded: () => "This one isn't open to you",
  no_profile: () => "Set up your creator profile to accept",
  no_account: (platform) => `Connect your ${platform} account to accept`,
  unverified: (platform) => `Verify your ${platform} account to accept`,
  below: () => "Outside your follower tier",
  above: () => "Outside your follower tier",
};

/** A UGC campaign as a reel: price per yapp, who it's for, and how many yapps are left. */
export function CampaignReel({
  item,
  reducedMotion,
  onOpen,
  position,
  setSize,
}: ReelProps<CampaignItem>) {
  const s = useDemo();
  const { request, own, eligibility, openSlots } = item;
  const terms = request.campaign;
  const business = businessById(s, request.businessId);
  if (!terms) return null;
  const tier = tierById[terms.tierId];
  const platform = campaignPlatformById[terms.platform].name;
  const closed = request.status === "closed";
  const taken = request.slots - openSlots;

  const seats = closed
    ? "Closed"
    : openSlots === 0
      ? "All yapps taken"
      : !own && openSlots <= 3
        ? (
            <>
              Only {plural(openSlots, "yapp")} left ·{" "}
              <span className="whitespace-nowrap">{openSlots === 1 ? "take it now" : "take one now"}</span>
            </>
          )
        : `${openSlots} of ${request.slots} slots open`;
  const reason = !own && !eligibility.ok && !closed && openSlots > 0 ? reasonLine[eligibility.reason]?.(platform) : undefined;
  const pill: Pill = own
    ? { label: "Manage", neon: false }
    : eligibility.ok
      ? { label: "Accept", neon: true, ariaLabel: `Accept a yapp on ${request.title}` }
      : { label: "See details", neon: false };

  return (
    <GradientReel
      item={item}
      business={business}
      kindLabel={`UGC campaign on ${platform}`}
      pill={pill}
      reducedMotion={reducedMotion}
      onOpen={onOpen}
      position={position}
      setSize={setSize}
      facts={
        <div className="flex flex-col gap-1.5">
          <p className="flex items-baseline gap-2">
            <span className="y-display y-num y-reel-big font-semibold">{money(terms.pricePerVideo)}</span>
            <span className="y-body font-semibold">per yapp</span>
          </p>
          <p className="y-small font-semibold">
            {platform} · {tier.label} followers
          </p>
          {terms.explainer ? (
            <span className="y-reel-chip y-reel-hide-short mt-1 self-start">
              <Film size={14} aria-hidden /> Explainer video · {clock(terms.explainer.durationSec)}
            </span>
          ) : null}
        </div>
      }
      seats={
        <div className="flex flex-col gap-2">
          {request.slots <= 20 && !closed ? (
            <span aria-hidden className="y-reel-hide-short flex flex-wrap gap-1.5">
              {Array.from({ length: request.slots }, (_, index) => (
                <span key={index} className="y-reel-pip" data-taken={index < taken} />
              ))}
            </span>
          ) : null}
          <p className="y-display y-reel-seats font-semibold">{seats}</p>
          {reason ? <p className="y-small font-semibold">{reason}</p> : null}
        </div>
      }
    />
  );
}

/**
 * The one template every order reel uses (the PM's "text reels can't be edited like Stories"):
 * a bold gradient page picked by id, who's ordering, a big title, one line of what they want,
 * the key facts, and one pill. ⋯ sits at the top end.
 */
function GradientReel({
  item,
  business,
  kindLabel,
  pill,
  facts,
  seats,
  reducedMotion,
  onOpen,
  position,
  setSize,
}: {
  item: OrderItem | CampaignItem;
  business?: Business;
  kindLabel: string;
  pill: Pill;
  facts: React.ReactNode;
  seats?: React.ReactNode;
  reducedMotion: boolean;
  onOpen: (href: string) => void;
  position: number;
  setSize: number;
}) {
  const { request, own } = item;
  const href = reelHref(item);
  return (
    <ReelFrame
      kind={item.kind}
      gradient={reelGradient(request.id)}
      label={reelLabel(item, business?.name)}
      href={href}
      action={pill.label}
      reducedMotion={reducedMotion}
      onOpen={onOpen}
      position={position}
      setSize={setSize}
    >
      <ReelGraphic request={request} />

      <div className="relative z-[1] flex h-full flex-col gap-[min(20px,2.6cqh)] px-5 pt-[68px] pb-4">
        <div className="flex min-w-0 items-center gap-3">
          {business ? <BusinessLogo business={business} size={40} /> : null}
          <div className="flex min-w-0 flex-col">
            <span className="y-body truncate font-semibold">{business?.name ?? "Someone"}</span>
            {own ? (
              <span className="y-reel-chip mt-1 self-start !min-h-7">Your order</span>
            ) : (
              <span className="y-small truncate font-medium">{kindLabel}</span>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 overflow-hidden">
          <h2 className="y-display y-reel-title line-clamp-4 font-semibold">{request.title}</h2>
          {request.brief.keyMessage ? (
            <p className="y-reel-line y-reel-hide-short line-clamp-2 font-medium">{request.brief.keyMessage}</p>
          ) : null}
        </div>

        {facts}
        {seats}

        <PillButton
          href={href}
          variant={pill.neon ? "neon" : "contrast"}
          size="lg"
          arrow={pill.neon}
          className="w-full flex-none"
          aria-label={pill.ariaLabel}
        >
          {pill.label}
        </PillButton>
      </div>

      <div className="absolute end-3 top-3 z-[3]">
        <ReelMenu item={item} />
      </div>
    </ReelFrame>
  );
}

/**
 * One of three bold shapes (circles, a ring, a tilted squircle), drawn only in the gradient's
 * two end colours so text contrast holds wherever it lands.
 */
function ReelGraphic({ request }: { request: ContentRequest }) {
  const motif = pickBy([0, 1, 2] as const, hashString(request.id), 11);
  if (motif === 0)
    return (
      <span aria-hidden>
        <span className="y-reel-shape-to absolute -end-[24%] -top-[8%] aspect-square w-[78%] rounded-full" />
        <span className="y-reel-shape-from absolute -start-[30%] bottom-[22%] aspect-square w-[58%] rounded-full" />
      </span>
    );
  if (motif === 1)
    return (
      <span aria-hidden>
        <span className="y-reel-ring-to absolute -end-[30%] -top-[10%] aspect-square w-[92%] rounded-full" />
      </span>
    );
  return (
    <span aria-hidden>
      <span className="y-reel-shape-to absolute -end-[18%] top-[4%] aspect-square w-[64%] rotate-[18deg] rounded-[30%]" />
      <span className="y-reel-shape-from absolute -start-[12%] bottom-[30%] aspect-square w-[30%] -rotate-[12deg] rounded-[30%]" />
    </span>
  );
}
