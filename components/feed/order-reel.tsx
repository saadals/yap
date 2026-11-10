"use client";

import { Film, MailOpen } from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { languageList } from "@/components/domain/chips";
import { clock, creatorNet, dueLabel, money, moneyExact, moneyRange, netRange, plural, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import type { IneligibleReason } from "@/lib/selectors";
import { businessById, platformList, productById } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { CAMPAIGN_FEE_RATE, PICK_NOW, formatById, requestStatus, tierById } from "@/lib/taxonomy";
import type { Business } from "@/lib/types";

import type { CampaignItem, OrderItem } from "./feed-items";
import { reelLabel, reelPalette } from "./feed-items";
import { ReelBackdrop, ReelCast } from "./reel-canvas";
import { ReelCta, ReelFrame, ReelWho, type ReelProps } from "./reel-frame";
import { ReelMenu } from "./reel-menu";

/** A custom order as a reel: what they want, the budget, and Pitch. */
export function OrderReel({ item, reducedMotion, onOpen, position, setSize }: ReelProps<OrderItem>) {
  const s = useDemo();
  const { request, own } = item;
  const business = businessById(s, request.businessId);
  const open = request.status === "open";
  const due = dueLabel(request.dueDate);
  const toDetails = () => onOpen(item.id);

  const cta = own ? (
    <ReelCta label="Manage" href={paths.order(request.id)} />
  ) : !open ? (
    <ReelCta label="See details" onClick={toDetails} />
  ) : item.pitch ? (
    <ReelCta label="See your pitch" href={paths.order(request.id)} />
  ) : (
    <ReelCta label="Pitch" neon onClick={toDetails} ariaLabel={`Pitch on ${request.title}`} />
  );

  return (
    <CanvasReel
      item={item}
      business={business}
      kindLabel="Custom order"
      cta={cta}
      reducedMotion={reducedMotion}
      onOpen={onOpen}
      position={position}
      setSize={setSize}
      price={
        <>
          <span className="y-display y-num y-reel-big">{moneyRange(request.budget.min, request.budget.max)}</span>{" "}
          <span className="y-reel-unit">
            budget{own ? "" : ` · you earn ${netRange(request.budget.min, request.budget.max)}`}
          </span>
        </>
      }
      meta={
        <>
          {formatById[request.brief.format]?.name} · {languageList(request.brief.languages)}
          <br />
          {open ? due.text : requestStatus[request.status].label} ·{" "}
          {item.pitchCount ? plural(item.pitchCount, "pitch", "pitches") : "No pitches yet"}
        </>
      }
      tag={
        item.invited && !own ? (
          <span className="y-reel-tag">
            <MailOpen size={13} aria-hidden /> Invited you
          </span>
        ) : undefined
      }
    />
  );
}

export const reasonLine: Partial<Record<IneligibleReason, (platform: string) => string>> = {
  joined: () => "You already have a Yapp on this one",
  excluded: () => "This one isn't open to you",
  no_profile: () => "Set up your creator profile to make one",
  no_account: (platform) => `Connect your ${platform} account to make one`,
  unverified: (platform) => `Verify your ${platform} account to make one`,
  below: () => "Outside your follower tier",
  above: () => "Outside your follower tier",
};

/** What the campaign button should be for this viewer, on the reel and in its details. */
export type CampaignState =
  | { kind: "make" }
  | { kind: "mine"; commissionId: string; label: string }
  | { kind: "manage" }
  | { kind: "full" }
  | { kind: "closed" }
  | { kind: "ineligible"; reason: IneligibleReason };

export function campaignState(item: CampaignItem): CampaignState {
  const { request, own, eligibility, openSlots, slot } = item;
  if (own) return { kind: "manage" };
  // Before the first upload, the brand's deadline; after it, where the Yapp stands.
  if (slot)
    return {
      kind: "mine",
      commissionId: slot.id,
      label:
        slot.status === "completed"
          ? "Your Yapp · done"
          : slot.status === "in_progress" && slot.deliveries.length === 0
            ? `Your Yapp · due ${shortDate(slot.dueDate)}`
            : "Your Yapp · in progress",
    };
  if (request.status === "closed") return { kind: "closed" };
  if (openSlots === 0) return { kind: "full" };
  if (eligibility.ok) return { kind: "make" };
  return { kind: "ineligible", reason: eligibility.reason };
}

/** A UGC campaign as a reel: price per Yapp, who it's for, and how many are left. */
export function CampaignReel({
  item,
  reducedMotion,
  onOpen,
  position,
  setSize,
}: ReelProps<CampaignItem>) {
  const s = useDemo();
  const { request, openSlots } = item;
  const terms = request.campaign;
  const business = businessById(s, request.businessId);
  if (!terms) return null;
  const tier = tierById[terms.tierId];
  const platform = platformList(terms.platforms);
  const state = campaignState(item);
  const toDetails = () => onOpen(item.id);
  const reason = state.kind === "ineligible" ? reasonLine[state.reason]?.(platform) : undefined;

  const cta =
    state.kind === "manage" ? (
      <ReelCta label="Manage" href={paths.order(request.id)} />
    ) : state.kind === "mine" ? (
      <ReelCta label={state.label} href={paths.commission(state.commissionId)} />
    ) : state.kind === "full" ? (
      <ReelCta label="Campaign full" disabled />
    ) : state.kind === "make" ? (
      <ReelCta
        label={PICK_NOW}
        neon
        chip={{ open: openSlots, total: request.slots }}
        onClick={toDetails}
        ariaLabel={`${PICK_NOW}, ${openSlots} of ${request.slots} remaining`}
      />
    ) : (
      <ReelCta label="See details" onClick={toDetails} />
    );

  return (
    <CanvasReel
      item={item}
      business={business}
      kindLabel={`UGC campaign · ${platform}`}
      cta={cta}
      reducedMotion={reducedMotion}
      onOpen={onOpen}
      position={position}
      setSize={setSize}
      price={
        <>
          <span className="y-display y-num y-reel-big">{money(terms.pricePerVideo)}</span>{" "}
          <span className="y-reel-unit">
            per Yapp
            {state.kind === "manage" ? "" : ` · you earn ${moneyExact(creatorNet(terms.pricePerVideo, CAMPAIGN_FEE_RATE))}`}
          </span>
        </>
      }
      meta={
        <>
          {platform} · {tier.label} followers · Post to your own account
          {reason ? (
            <>
              <br />
              <span className="font-semibold">{reason}</span>
            </>
          ) : null}
        </>
      }
      tag={
        terms.explainer ? (
          <span className="y-reel-tag y-reel-hide-short">
            <Film size={13} aria-hidden /> Explainer video · {clock(terms.explainer.durationSec)}
          </span>
        ) : undefined
      }
    />
  );
}

/**
 * The one template every order reel uses (the PM's "text reels can't be edited like Stories"): a
 * light canvas picked by id, who's ordering, a big title, one line of what they want, playful
 * characters, the key facts, and one button.
 */
function CanvasReel({
  item,
  business,
  kindLabel,
  cta,
  price,
  meta,
  tag,
  reducedMotion,
  onOpen,
  position,
  setSize,
}: {
  item: OrderItem | CampaignItem;
  business?: Business;
  kindLabel: string;
  cta: React.ReactNode;
  price: React.ReactNode;
  meta: React.ReactNode;
  tag?: React.ReactNode;
  reducedMotion: boolean;
  onOpen: (id: string) => void;
  position: number;
  setSize: number;
}) {
  const s = useDemo();
  const { request, own } = item;
  const palette = reelPalette(request.id);
  const product = productById(s, request.brief.productId);
  return (
    <ReelFrame
      kind={item.kind}
      id={item.id}
      palette={palette}
      label={reelLabel(item, business?.name)}
      reducedMotion={reducedMotion}
      onOpen={onOpen}
      position={position}
      setSize={setSize}
    >
      <ReelBackdrop />
      <ReelWho
        avatar={business ? <BusinessLogo business={business} size={28} /> : null}
        name={business?.name ?? "Someone"}
        sub={own ? "Your order" : kindLabel}
      />

      <div className="y-reel-post">
        {tag}
        <h2 className="y-display y-reel-title line-clamp-4">{request.title}</h2>
        {request.brief.keyMessage ? (
          <p className="y-reel-sub line-clamp-2">{request.brief.keyMessage}</p>
        ) : null}

        <ReelCast
          id={request.id}
          palette={palette}
          niche={product?.niche}
          onCamera={request.brief.onCamera}
          reducedMotion={reducedMotion}
        />

        <div className="y-reel-facts">
          <div className="min-w-0">
            <p>{price}</p>
            <p className="y-reel-meta">{meta}</p>
          </div>
          <ReelMenu item={item} />
        </div>
        {cta}
      </div>
    </ReelFrame>
  );
}
