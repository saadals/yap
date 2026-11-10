"use client";

import { ArrowLeft, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { TakeSlotSheet } from "@/components/campaigns/take-view";
import type { CampaignRequest } from "@/components/campaigns/owner-sheets";
import { BusinessRow } from "@/components/creator/opportunity-blocks";
import { BriefSummary } from "@/components/domain/brief-summary";
import { languageList } from "@/components/domain/chips";
import { VideoThumb } from "@/components/domain/video-thumb";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { creatorNet, dueLabel, money, moneyExact, moneyRange, netRange, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { businessById, pitchesForRequest, platformList, portfolio, productById, startingPrice } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { CAMPAIGN_FEE_RATE, PICK_NOW, formatById, requestStatus, tierById, usageById } from "@/lib/taxonomy";

import type { CampaignItem, FeedItem, OrderItem, VideoItem } from "./feed-items";
import { reelHref } from "./feed-items";
import { campaignState, reasonLine } from "./order-reel";
import { ReelCta } from "./reel-frame";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div data-tone="paper" className="y-detail-card">
      {children}
    </div>
  );
}

/**
 * Swipe left (or the reel's pill): the details layer, inside the feed so "Back" returns to the same
 * reel. Light glass cards, and one sticky button above the tab bar.
 */
export function ReelDetails({
  item,
  onClose,
  restoreFocus,
}: {
  item: FeedItem;
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    return restoreFocus;
  }, [restoreFocus]);

  return (
    <section ref={ref} role="dialog" aria-labelledby={titleId} tabIndex={-1} className="y-details">
      <div className="y-details-scroll">
        <button type="button" onClick={onClose} className="y-details-back">
          <ArrowLeft size={18} aria-hidden className="y-flip" />
          Back to feed
        </button>
        {item.kind === "video" ? (
          <VideoBody item={item} titleId={titleId} />
        ) : item.kind === "campaign" ? (
          <CampaignBody item={item} titleId={titleId} />
        ) : (
          <OrderBody item={item} titleId={titleId} />
        )}
      </div>
      <span aria-hidden className="y-details-fade" />
      <div className="y-details-cta">
        {item.kind === "video" ? (
          <ReelCta label={`Order from ${item.creator.firstName}`} neon href={reelHref(item)} />
        ) : item.kind === "campaign" ? (
          <CampaignButton item={item} />
        ) : (
          <OrderButton item={item} />
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Custom order                                                                */
/* -------------------------------------------------------------------------- */

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function OrderBody({ item, titleId }: { item: OrderItem; titleId: string }) {
  const s = useDemo();
  const { request } = item;
  const business = businessById(s, request.businessId);
  const product = productById(s, request.brief.productId);
  const open = request.status === "open";
  const quotes = pitchesForRequest(s, request.id).map((pitch) => pitch.price);

  return (
    <>
      <Card>
        <h2 id={titleId} className="y-display y-title">
          {request.title}
        </h2>
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="y-display y-num y-reel-big">{moneyRange(request.budget.min, request.budget.max)}</span>
          <span className="y-reel-unit">
            budget{item.own ? "" : ` · you earn ${netRange(request.budget.min, request.budget.max)}`}
          </span>
        </p>
        <p className="y-small y-fg-2">
          {formatById[request.brief.format]?.name} · {languageList(request.brief.languages)} ·{" "}
          {open ? dueLabel(request.dueDate).text : requestStatus[request.status].label}
        </p>
      </Card>
      {business ? (
        <Card>
          <BusinessRow business={business} request={request} />
        </Card>
      ) : null}
      <Card>
        <h3 className="y-head">Pitches</h3>
        <p className="y-small y-fg-2">
          {quotes.length
            ? `${plural(quotes.length, "pitch", "pitches")} so far · typical quote ${money(median(quotes))}`
            : "No pitches yet. Yours could be the first."}
        </p>
      </Card>
      <Card>
        <h3 className="y-head">The brief</h3>
        <BriefSummary brief={request.brief} product={product} />
      </Card>
    </>
  );
}

function OrderButton({ item }: { item: OrderItem }) {
  const { request, own, pitch } = item;
  const page = paths.order(request.id);
  if (own) return <ReelCta label="Manage" href={page} />;
  if (pitch) return <ReelCta label="See your pitch" href={page} />;
  if (request.status !== "open") return <ReelCta label="See the order" href={page} />;
  return <ReelCta label="Write your pitch" neon href={`${page}#pitch`} />;
}

/* -------------------------------------------------------------------------- */
/* UGC campaign                                                                */
/* -------------------------------------------------------------------------- */

function CampaignBody({ item, titleId }: { item: CampaignItem; titleId: string }) {
  const s = useDemo();
  const { request, openSlots } = item;
  const terms = request.campaign;
  if (!terms) return null;
  const business = businessById(s, request.businessId);
  const product = productById(s, request.brief.productId);
  const platform = platformList(terms.platforms);
  const taken = request.slots - openSlots;

  return (
    <>
      <Card>
        <h2 id={titleId} className="y-display y-title">
          {request.title}
        </h2>
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="y-display y-num y-reel-big">{money(terms.pricePerVideo)}</span>
          <span className="y-reel-unit">
            per Yapp{item.own ? "" : ` · you earn ${moneyExact(creatorNet(terms.pricePerVideo, CAMPAIGN_FEE_RATE))}`}
          </span>
        </p>
        <p className="y-small y-fg-2">
          {platform} · {tierById[terms.tierId].label} followers · Post to your own account
        </p>
        <p className="y-small y-fg-2">Usage: {usageById[request.brief.usage].name}, included in the price</p>
      </Card>
      {business ? (
        <Card>
          <BusinessRow business={business} request={request} />
        </Card>
      ) : null}
      <Card>
        <h3 className="y-head">Yapps</h3>
        <span aria-hidden className="y-slotbar">
          {Array.from({ length: request.slots }, (_, index) => (
            <span key={index} data-taken={index < taken} />
          ))}
        </span>
        <p className="y-small y-fg-2">
          {openSlots} of {request.slots} remaining · upload within {plural(terms.deadlineDays, "day")} of taking one
        </p>
      </Card>
      <Card>
        <h3 className="y-head">The brief</h3>
        <BriefSummary brief={request.brief} product={product} />
      </Card>
    </>
  );
}

function CampaignButton({ item }: { item: CampaignItem }) {
  const toast = useToast();
  const [sheet, setSheet] = useState<"take" | "setup" | null>(null);
  const { request, openSlots } = item;
  const terms = request.campaign;
  if (!terms) return null;
  const platform = platformList(terms.platforms);
  const state = campaignState(item);
  const page = paths.order(request.id);
  const reason = state.kind === "ineligible" ? reasonLine[state.reason]?.(platform) : undefined;

  const button =
    state.kind === "make" ? (
      <ReelCta
        label={PICK_NOW}
        neon
        chip={{ open: openSlots, total: request.slots }}
        onClick={() => setSheet("take")}
        ariaLabel={`${PICK_NOW}, ${openSlots} of ${request.slots} remaining`}
      />
    ) : state.kind === "mine" ? (
      <ReelCta label={state.label} href={paths.commission(state.commissionId)} />
    ) : state.kind === "manage" ? (
      <ReelCta label="Manage" href={page} />
    ) : state.kind === "full" ? (
      <ReelCta label="Campaign full" disabled />
    ) : state.kind === "ineligible" && state.reason === "no_profile" ? (
      <ReelCta label="Set up a creator profile" neon onClick={() => setSheet("setup")} />
    ) : state.kind === "ineligible" && state.reason === "no_account" ? (
      <ReelCta label={`Connect your ${platform} account`} neon href={paths.editProfile("accounts")} />
    ) : (
      <ReelCta label="See full details" href={page} />
    );

  return (
    <>
      {reason ? <p className="y-small text-center font-semibold">{reason}</p> : null}
      {button}
      {sheet === "take" && request.campaign ? (
        <TakeSlotSheet
          request={request as CampaignRequest}
          onClose={() => setSheet(null)}
          onFull={() => {
            setSheet(null);
            toast({ message: "All slots were just taken", tone: "info" });
          }}
        />
      ) : null}
      <CreatorSetupSheet
        open={sheet === "setup"}
        onClose={() => setSheet(null)}
        onDone={() => {
          setSheet(null);
          toast({ message: `Your creator profile is ready. Next, connect your ${platform}.` });
        }}
        reason="to pick a slot on this campaign"
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Creator video                                                               */
/* -------------------------------------------------------------------------- */

function VideoBody({ item, titleId }: { item: VideoItem; titleId: string }) {
  const s = useDemo();
  const { creator } = item;
  const videos = portfolio(s, creator).slice(0, 6);
  const fastest = Math.min(...creator.packages.map((p) => p.deliveryDays));

  return (
    <>
      <Card>
        <div className="flex items-center gap-3">
          <FaceAvatar id={creator.id} name="" size={56} />
          <div className="min-w-0">
            <h2 id={titleId} className="y-head flex items-center gap-1.5">
              <span className="truncate">{creator.name}</span>
              {creator.verified ? <BadgeCheck size={16} aria-label="Verified" className="flex-none" /> : null}
            </h2>
            <p className="y-small y-fg-2" dir="ltr">
              @{creator.handle}
            </p>
          </div>
        </div>
        <p className="y-small y-fg-2">
          {creator.rating.toFixed(1)} ({plural(creator.reviewCount, "review")}) · From {money(startingPrice(creator))} ·{" "}
          {fastest}-day delivery
        </p>
        <PillButton href={paths.creator(creator.handle)} variant="outline" size="sm" className="self-start">
          View full profile
        </PillButton>
      </Card>
      {videos.length ? (
        <Card>
          <h3 className="y-head">Portfolio</h3>
          <ul className="grid grid-cols-3 gap-2">
            {videos.map((video) => (
              <li key={video.id}>
                <Link href={paths.reel(video.id)} aria-label={`Watch ${video.title}`} className="block">
                  <VideoThumb video={video} frame="9:16" showHook={false} showMeta={false} showViews={false} decorative />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
