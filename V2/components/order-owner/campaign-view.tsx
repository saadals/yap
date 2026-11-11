"use client";

import {
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Lightbulb,
  Link2,
  Lock,
  Megaphone,
  Pencil,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  UserMinus,
  UserPlus,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { paymentLabel } from "@/components/domain/money";
import { StarInput, StarRow } from "@/components/domain/stars";
import { RequestBadge, SlotBadge } from "@/components/domain/status-badge";
import { VideoPlayer } from "@/components/domain/video-player";
import { VideoThumb } from "@/components/domain/video-thumb";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { List, Row } from "@/components/ui/list";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { KeyValues, ProgressBar } from "@/components/ui/progress";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { agoLower, autoApproveAt } from "@/lib/attention";
import { useMediaQuery } from "@/lib/hooks";
import { money, moneyExact, plural, shortDate, timeAgoInline, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import {
  brandHandleFor,
  campaignMoney,
  campaignProgress,
  campaignSlots,
  creatorById,
  latestDelivery,
  platformList,
  productById,
  slotPlatform,
  type SlotView,
} from "@/lib/selectors";
import { absoluteUrl } from "@/lib/site";
import { actions, useDemo } from "@/lib/store";
import {
  CAMPAIGN_MAX_REASSIGNMENTS,
  CAMPAIGN_RELEASE_DAYS,
  CAMPAIGN_RESTORE_HOURS,
  PRICE_MAX_PER_YAPP,
  campaignPlatformById,
  languageById,
  tierById,
  usageById,
} from "@/lib/taxonomy";
import type { Commission, Creator } from "@/lib/types";

import "@/app/styles/order-owner.css";

import {
  ChangeTierSheet,
  ChangesSheet,
  CloseCampaignSheet,
  EditCampaignSheet,
  LearningSheet,
  RaisePriceSheet,
  RejectSheet,
  RemoveCreatorSheet,
} from "./campaign-sheets";
import { Bullets, ExplainerTile, MetaLine, OverflowMenu, RailSection, Watermark, type MenuItem } from "./parts";
import {
  deadlineRule,
  followersOn,
  payRule,
  perYapp,
  postLabel,
  postingRule,
  type CampaignRequest,
} from "./shared";

type SheetState =
  | { kind: "tier" | "price" | "close" | "edit" | "learning" }
  | { kind: "changes" | "reject" | "remove"; commissionId: string };

/** Remove is only for a creator who hasn't uploaded anything yet. */
const canRemove = (c: Commission) => c.status === "in_progress" && c.deliveries.length === 0;

/**
 * The owner's view of a UGC campaign. Review copies come first whenever any are waiting (approve
 * with a quick rating, request changes, or reject: the slot reopens); then progress, then every
 * slot with the platform its creator posts on and the handle to tag there. The rail holds the
 * money (held, paid out, refunded: listed prices, nothing on top) and what creators were told. It
 * reads the store, so it follows simulated creators picking, uploading and posting live.
 */
export function CampaignOwnerView({ request }: { request: CampaignRequest }) {
  const s = useDemo();
  const toast = useToast();
  const [sheet, setSheet] = useState<SheetState | null>(null);
  // The review queue: one copy in full (the one that approves itself soonest, or the one you
  // picked), the rest as rows. A decision moves the queue on by itself.
  const [currentId, setCurrentId] = useState<string | null>(null);

  const terms = request.campaign;
  const product = productById(s, request.brief.productId);
  const tier = tierById[terms.tierId];
  const closed = request.status === "closed";
  const isDraft = request.status === "draft";
  const slots = campaignSlots(s, request);
  const reviews = slots
    .map((view) => view.commission)
    .filter((c): c is Commission => c?.status === "delivered")
    .sort((a, b) => Date.parse(autoApproveAt(a)) - Date.parse(autoApproveAt(b)));
  const current = reviews.find((c) => c.id === currentId) ?? reviews[0];
  const currentCreator = current ? creatorById(s, current.creatorId) : undefined;
  const upNext = reviews.filter((c) => c !== current);

  const copyLink = async () => {
    const url = absoluteUrl(paths.order(request.id));
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: "Link copied. Eligible creators who open it can pick a slot." });
    } catch {
      toast({ message: `Copy this link: ${url}`, tone: "info" });
    }
  };

  const menu: MenuItem[] = [
    {
      label: "Raise the price",
      icon: <TrendingUp size={16} aria-hidden />,
      disabled: closed
        ? "The campaign is closed"
        : isDraft
          ? "Set the price when you post it"
          : terms.pricePerVideo >= PRICE_MAX_PER_YAPP
            ? `Already at the ${money(PRICE_MAX_PER_YAPP)} maximum`
            : undefined,
      onSelect: () => setSheet({ kind: "price" }),
    },
    {
      label: "Change who can pick",
      icon: <SlidersHorizontal size={16} aria-hidden />,
      disabled: terms.tierChangedAt
        ? `Already changed on ${shortDate(terms.tierChangedAt)}. It can change once.`
        : closed
          ? "The campaign is closed"
          : isDraft
            ? "Set the tier when you post it"
            : undefined,
      onSelect: () => setSheet({ kind: "tier" }),
    },
    { label: "Edit what creators are told", icon: <Pencil size={16} aria-hidden />, onSelect: () => setSheet({ kind: "edit" }) },
    ...(product
      ? [{ label: "Save a learning", icon: <Lightbulb size={16} aria-hidden />, onSelect: () => setSheet({ kind: "learning" }) }]
      : []),
    { label: "Run it again", icon: <RotateCcw size={16} aria-hidden />, href: paths.newOrder({ type: "campaign", again: request.id }) },
    { label: "Copy link for creators", icon: <Link2 size={16} aria-hidden />, onSelect: () => void copyLink() },
    ...(closed || isDraft
      ? []
      : [{ label: "Close campaign", icon: <Ban size={16} aria-hidden />, danger: true, onSelect: () => setSheet({ kind: "close" }) }]),
  ];

  const meta = (
    <MetaLine
      items={[
        platformList(terms.platforms),
        `${tier.label} followers`,
        terms.postedPrice && terms.postedPrice !== terms.pricePerVideo
          ? `${perYapp(terms.pricePerVideo)} (raised from ${money(terms.postedPrice)})`
          : perYapp(terms.pricePerVideo),
        closed || isDraft ? null : `Open until ${weekdayDate(terms.closesAt)}`,
      ]}
    />
  );

  const target = sheet && "commissionId" in sheet ? s.commissions.find((c) => c.id === sheet.commissionId) : undefined;
  const targetCreator = target ? creatorById(s, target.creatorId) : undefined;

  return (
    <Page>
      <PageHeader
        back={{ href: paths.orders(), label: "Orders" }}
        title={<span className="block max-w-[28ch]">{request.title}</span>}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <RequestBadge status={request.status} campaign />
            {meta}
          </span>
        }
        actions={<OverflowMenu label="More for this campaign" items={menu} size="md" tone="outline" />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start [&>*]:min-w-0">
        <div className="flex flex-col gap-6 lg:col-span-8">
          {isDraft ? (
            <Block tone="paper" pad="md" className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <h2 className="y-head">This campaign is a draft</h2>
                <p className="y-small y-fg-2">Creators can&apos;t see it, and nothing is charged until you post it.</p>
              </div>
              <PillButton href={paths.newOrder({ type: "campaign", draft: request.id })} variant="neon" arrow className="justify-between ps-5">
                Finish and post
              </PillButton>
            </Block>
          ) : null}

          {reviews.length ? (
            <section id="review-copies" aria-labelledby="review-h" className="flex flex-col gap-3">
              <div className="flex flex-col">
                <h2 id="review-h" className="y-title">
                  {reviews.length === 1 ? "A review copy is ready" : `${reviews.length} review copies are ready`}
                </h2>
                <p className="y-small y-fg-2 max-sm:hidden">
                  Watch each one, then approve it, request changes or reject it. A copy you don&apos;t answer approves itself 3 days after upload.
                </p>
              </div>
              {current && currentCreator ? (
                <ReviewCopyCard
                  key={`${current.id}-${current.deliveries.length}`}
                  commission={current}
                  creator={currentCreator}
                  request={request}
                  position={reviews.length > 1 ? `${reviews.indexOf(current) + 1} of ${reviews.length}` : undefined}
                  onChanges={() => setSheet({ kind: "changes", commissionId: current.id })}
                  onReject={() => setSheet({ kind: "reject", commissionId: current.id })}
                />
              ) : null}
              {upNext.length ? (
                <div className="flex flex-col gap-2">
                  <h3 className="y-small y-fg-2 font-medium">Up next · {upNext.length}</h3>
                  <List label="Review copies up next">
                    {upNext.map((c) => {
                      const creator = creatorById(s, c.creatorId);
                      const latest = latestDelivery(c);
                      return (
                        <Row
                          key={c.id}
                          onClick={() => setCurrentId(c.id)}
                          lead={<FaceAvatar id={c.creatorId} name="" size={36} />}
                          title={`${creator?.name ?? "A creator"} · slot ${c.campaignSlot}`}
                          meta={`Uploaded ${latest ? agoLower(latest.deliveredAt) : "recently"} · approves itself ${weekdayDate(autoApproveAt(c))}`}
                          ariaLabel={`Review ${creator?.firstName ?? "the creator"}'s copy, slot ${c.campaignSlot}`}
                        />
                      );
                    })}
                  </List>
                </div>
              ) : null}
            </section>
          ) : null}

          <ProgressCard request={request} />
          <SlotsCard request={request} onRemove={(id) => setSheet({ kind: "remove", commissionId: id })} />
        </div>

        <aside aria-label="About this campaign" className="y-rail flex flex-col gap-2 lg:col-span-4">
          <MoneyCard request={request} />
          <ToldCard request={request} onEdit={() => setSheet({ kind: "edit" })} />
          <RulesCard request={request} />
        </aside>
      </div>

      {sheet?.kind === "tier" ? <ChangeTierSheet request={request} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === "price" ? <RaisePriceSheet request={request} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === "close" ? <CloseCampaignSheet request={request} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === "edit" ? <EditCampaignSheet request={request} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === "learning" && product ? (
        <LearningSheet productId={product.id} productName={product.name} onClose={() => setSheet(null)} />
      ) : null}
      {sheet?.kind === "changes" && target && targetCreator ? (
        <ChangesSheet commission={target} creator={targetCreator} onClose={() => setSheet(null)} />
      ) : null}
      {sheet?.kind === "reject" && target && targetCreator ? (
        <RejectSheet commission={target} creator={targetCreator} request={request} onClose={() => setSheet(null)} />
      ) : null}
      {sheet?.kind === "remove" && target && targetCreator ? (
        <RemoveCreatorSheet commission={target} creator={targetCreator} request={request} onClose={() => setSheet(null)} />
      ) : null}
    </Page>
  );
}

/* -------------------------------------------------------------------------- */
/* Review copies                                                               */
/* -------------------------------------------------------------------------- */

function ReviewCopyCard({
  commission,
  creator,
  request,
  position,
  onChanges,
  onReject,
}: {
  commission: Commission;
  creator: Creator;
  request: CampaignRequest;
  /** "2 of 6" while several copies wait. */
  position?: string;
  onChanges: () => void;
  onReject: () => void;
}) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [watching, setWatching] = useState(false);
  const wide = useMediaQuery("(min-width: 640px)");
  const delivery = latestDelivery(commission);
  const video = delivery?.video;
  if (!delivery || !video) return null;
  const platform = slotPlatform(commission, request);
  const platformName = campaignPlatformById[platform].name;
  const followers = followersOn(creator, platform);
  const approve = () => {
    actions.approve(commission.id, { rating: rating || undefined });
    toast({
      message: `Approved. ${creator.firstName} posts it on ${platformName} next, tagging ${brandHandleFor(request.campaign, platform)}, and is paid ${CAMPAIGN_RELEASE_DAYS} days after we verify the post.`,
    });
  };
  const uploaded = `${delivery.version > 1 ? `Version ${delivery.version}, uploaded` : "Uploaded"} ${agoLower(delivery.deliveredAt)}`;
  const auto = `Approves itself ${weekdayDate(autoApproveAt(commission))}`;

  const who = (
    <div className="min-w-0">
      <p className="y-head flex items-center gap-1.5">
        <Link href={paths.creator(creator.handle)} className="truncate hover:underline">
          {creator.name}
        </Link>
        {creator.verified ? <BadgeCheck size={15} aria-label="ID verified" className="flex-none" /> : null}
      </p>
      <p className="y-micro y-fg-2">
        Slot {commission.campaignSlot} · {followers.text}
        {followers.verified ? ", verified" : ""}
        {position ? ` · copy ${position}` : ""}
      </p>
    </div>
  );

  const note = delivery.note ? (
    <p className="y-small y-fg-2 line-clamp-3 border-s-2 border-(--b-line) ps-3" dir="auto">
      {delivery.note}
    </p>
  ) : null;
  const lock = (
    <p className="y-micro y-fg-2 inline-flex items-start gap-1.5">
      <Lock size={13} aria-hidden className="mt-px flex-none" />
      Watermarked preview. The full-quality file unlocks when you approve.
    </p>
  );
  const rate = (
    <div className="flex flex-col gap-1.5 sm:border-t sm:border-(--b-line) sm:pt-4">
      <span className="y-small font-medium">
        Rate {creator.firstName} <span className="y-fg-2 font-normal">(optional)</span>
      </span>
      <StarInput value={rating} onChange={setRating} label={`Rate ${creator.firstName}`} size={24} />
    </div>
  );
  const buttons = (
    <div className="flex flex-wrap items-center gap-2">
      <PillButton
        variant="neon"
        icon={<Check size={16} aria-hidden />}
        className="max-sm:flex-1"
        onClick={approve}
      >
        Approve
      </PillButton>
      <PillButton variant="outline" className="max-sm:flex-1" onClick={onChanges}>
        Request changes
      </PillButton>
      <PillButton variant="ghost" className="max-sm:w-full" onClick={onReject}>
        Reject
      </PillButton>
    </div>
  );

  return (
    <Block as="article" tone="paper" pad="md" aria-label={`${creator.name}'s review copy, slot ${commission.campaignSlot}`}>
      {wide ? (
        <div className="oo-review">
          <div className="relative w-full max-w-[260px]">
            <VideoPlayer video={video} size="sm" />
            <Watermark video={video} />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center gap-3">
              <FaceAvatar id={creator.id} name="" size={40} />
              {who}
            </div>
            <p className="y-small flex flex-wrap gap-x-2">
              <span>{uploaded}</span>
              <span aria-hidden className="y-fg-2">
                ·
              </span>
              <span className="inline-flex items-center gap-1 font-medium">
                <Clock size={14} aria-hidden /> {auto}
              </span>
            </p>
            {note}
            {lock}
            {rate}
            {buttons}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3.5">
            <button
              type="button"
              onClick={() => setWatching(true)}
              aria-label={`Watch ${creator.firstName}'s review copy`}
              aria-haspopup="dialog"
              className="relative block w-[104px] flex-none rounded-(--y-r-tile)"
            >
              <VideoThumb video={video} frame="9:16" playable showHook={false} showMeta={false} decorative />
              <Watermark video={video} small />
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
              {who}
              <p className="y-small">{uploaded}</p>
              <p className="y-small inline-flex items-center gap-1 font-medium">
                <Clock size={14} aria-hidden className="flex-none" /> {auto}
              </p>
            </div>
          </div>
          {rate}
          {buttons}
          {note}
          {lock}
        </div>
      )}
      {watching ? (
        <Sheet
          open
          onClose={() => setWatching(false)}
          title={`${creator.firstName}'s review copy`}
          description={`Slot ${commission.campaignSlot} · uploaded ${agoLower(delivery.deliveredAt)} · approves itself ${weekdayDate(autoApproveAt(commission))}`}
          width="md"
        >
          <div className="relative mx-auto w-full max-w-[340px]">
            <VideoPlayer video={video} size="md" />
            <Watermark video={video} />
          </div>
        </Sheet>
      ) : null}
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */

function ProgressCard({ request }: { request: CampaignRequest }) {
  const s = useDemo();
  const p = campaignProgress(s, request);
  const closed = request.status === "closed";
  const counts = [
    { label: closed ? "Refunded" : "Open", value: p.open },
    { label: "Filming", value: p.filming },
    { label: "To review", value: p.review },
    { label: "Post due", value: p.postsDue },
    { label: "Posted", value: p.postsLive },
  ];
  return (
    <Block as="section" aria-labelledby="progress-h" tone="paper" pad="md" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="progress-h" className="y-micro y-fg-2 font-medium">
            Progress
          </h2>
          <p className="flex items-baseline gap-2">
            <span className="y-display y-num text-[32px] leading-none">{p.approved}</span>{" "}
            <span className="y-small y-fg-2">of {plural(p.total, "video")} approved</span>
          </p>
        </div>
        <p className="y-small y-fg-2">
          {p.taken} of {p.total} slots picked
        </p>
      </div>
      <ProgressBar value={p.total ? p.approved / p.total : 0} label={`${p.approved} of ${p.total} videos approved`} done={p.approved === p.total} />
      <dl className="grid grid-cols-3 gap-x-3 gap-y-3 sm:grid-cols-5">
        {counts.map((item) => (
          <div key={item.label} className="flex flex-col">
            <dt className="y-micro y-fg-2">{item.label}</dt>
            <dd className="y-head y-num">{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className="y-small y-fg-2 border-t border-(--b-line) pt-3">
        {closed
          ? "Closed. Unpicked slots were refunded in full; creators already filming carry on."
          : `Eligible creators pick slots first come, first served until ${weekdayDate(request.campaign.closesAt)}, unless you close it sooner. Slots nobody picks are refunded in full.`}
      </p>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Slots                                                                       */
/* -------------------------------------------------------------------------- */

function slotMeta(c: Commission): string {
  const latest = latestDelivery(c);
  switch (c.status) {
    case "in_progress":
      return `Picked ${timeAgoInline(c.createdAt)} · review copy due ${weekdayDate(c.dueDate)}`;
    case "delivered":
      return `Uploaded ${latest ? agoLower(latest.deliveredAt) : "recently"} · approves itself ${weekdayDate(autoApproveAt(c))}`;
    case "revision":
      return "Changes requested · a new copy comes back here";
    case "completed": {
      const post = c.post;
      if (post?.status === "live") {
        const paid = c.payment.status === "released";
        return `Posted ${post.at ? shortDate(post.at) : ""} · verified${paid ? " · paid" : c.withdrawableFrom ? ` · paid ${weekdayDate(c.withdrawableFrom)} if still up` : ""}`;
      }
      if (post?.status === "checking") return "Posted · checking the tag and the paid-partnership label";
      if (post?.status === "removed") return `Post taken down · ${CAMPAIGN_RESTORE_HOURS} hours to put it back`;
      return `Approved ${c.completedAt ? shortDate(c.completedAt) : ""} · waiting for the post`;
    }
    default:
      return "";
  }
}

type SlotGroup = { kind: "filled"; view: SlotView } | { kind: "open"; from: number; to: number };

/** Filled slots one row each; a run of open slots in one row ("3 open slots · 8–10"). */
function groupSlots(slots: SlotView[]): SlotGroup[] {
  const groups: SlotGroup[] = [];
  for (const view of slots) {
    const last = groups[groups.length - 1];
    if (view.commission) groups.push({ kind: "filled", view });
    else if (last?.kind === "open" && last.to === view.slot - 1) last.to = view.slot;
    else groups.push({ kind: "open", from: view.slot, to: view.slot });
  }
  return groups;
}

function SlotsCard({ request, onRemove }: { request: CampaignRequest; onRemove: (commissionId: string) => void }) {
  const s = useDemo();
  const slots = campaignSlots(s, request);
  const closed = request.status === "closed";
  const history = slots.flatMap((view) => view.previous.map((c) => ({ slot: view.slot, commission: c })));
  const [showHistory, setShowHistory] = useState(false);

  return (
    <section aria-labelledby="slots-h" className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <h2 id="slots-h" className="y-head">
          Slots
        </h2>
        <p className="y-micro y-fg-2">One creator per video</p>
      </div>
      <Block tone="paper" pad="none" className="overflow-visible">
        <ul className="y-list" aria-label="Slots">
          {groupSlots(slots).map((group) => {
            if (group.kind === "open") {
              const label = group.from === group.to ? `${group.from}` : `${group.from}–${group.to}`;
              const count = group.to - group.from + 1;
              return (
                <li key={`open-${group.from}`} className="y-row !min-h-[68px] !gap-3">
                  <span className="y-micro y-num y-fg-2 w-5 flex-none text-end" aria-hidden>
                    {group.from}
                  </span>
                  <span
                    aria-hidden
                    className="grid size-10 flex-none place-items-center rounded-full border-2 border-dashed border-(--b-line) text-(--b-fg-2)"
                  >
                    <UserPlus size={16} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="y-small font-medium">
                      {count === 1 ? "Open" : `${count} open slots`}
                      <span className="sr-only">, slot{count === 1 ? "" : "s"} {label}</span>
                      {count > 1 ? (
                        <span aria-hidden className="y-fg-2 font-normal">
                          {" "}
                          · {label}
                        </span>
                      ) : null}
                    </span>
                    <span className="y-micro y-fg-2 max-sm:line-clamp-2 sm:truncate">
                      {closed
                        ? "Closed · refunded"
                        : `Waiting for eligible creators${request.campaign.platforms.length > 1 ? ` on ${platformList(request.campaign.platforms)}` : ""}`}
                    </span>
                  </span>
                </li>
              );
            }
            const { view } = group;
            const c = view.commission!;
            const creator = creatorById(s, c.creatorId);
            if (!creator) return null;
            return (
              <li key={view.slot} className="y-row !min-h-[68px] !gap-3">
                <span className="y-micro y-num y-fg-2 w-5 flex-none text-end" aria-hidden>
                  {view.slot}
                </span>
                <FilledSlot c={c} creator={creator} slot={view.slot} request={request} onRemove={onRemove} />
              </li>
            );
          })}
        </ul>
        {history.length ? (
          <div className="border-t border-(--b-line) px-5 py-2">
            <button
              type="button"
              aria-expanded={showHistory}
              onClick={() => setShowHistory((v) => !v)}
              className="y-small flex min-h-11 w-full items-center gap-2 text-start font-medium"
            >
              <ChevronDown size={16} aria-hidden className={`flex-none transition-transform ${showHistory ? "rotate-180" : ""}`} />
              <span className="flex-1">Earlier creators</span>
              <span className="y-micro y-fg-2 font-normal">
                {CAMPAIGN_MAX_REASSIGNMENTS !== null
                  ? `${history.length} of ${CAMPAIGN_MAX_REASSIGNMENTS} reassignments`
                  : plural(history.length, "earlier creator")}
              </span>
            </button>
            {showHistory ? (
              <ul className="flex flex-col pb-2">
                {history.map(({ slot, commission }) => {
                  const creator = creatorById(s, commission.creatorId);
                  return (
                    <li key={commission.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                      <FaceAvatar id={commission.creatorId} name="" size={28} />
                      <Link
                        href={paths.job(commission.id)}
                        className="y-small min-w-0 flex-1 font-medium underline-offset-4 hover:underline"
                      >
                        {creator?.name ?? "A creator"}
                        <span className="y-fg-2 font-normal"> · slot {slot}</span>
                      </Link>
                      <SlotBadge commission={commission} side="business" />
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </Block>
    </section>
  );
}

function FilledSlot({
  c,
  creator,
  slot,
  request,
  onRemove,
}: {
  c: Commission;
  creator: Creator;
  slot: number;
  request: CampaignRequest;
  onRemove: (commissionId: string) => void;
}) {
  // Where this creator posts (chosen when picking) and the brand account to tag there. Only worth
  // a line when the campaign runs on more than one platform: with one, the header line and the
  // rail already say it.
  const platform = slotPlatform(c, request);
  const postsOn =
    request.campaign.platforms.length > 1
      ? `Posts on ${campaignPlatformById[platform].name} · tags ${brandHandleFor(request.campaign, platform)}`
      : null;
  const postUrl = c.post?.status === "live" || c.post?.status === "checking" ? c.post.url : undefined;
  const items: MenuItem[] = [
    { label: "Open the job", icon: <ArrowUpRight size={16} aria-hidden />, href: paths.job(c.id) },
    { label: "View profile", icon: <UserRound size={16} aria-hidden />, href: paths.creator(creator.handle) },
    ...(postUrl ? [{ label: "View the post", icon: <Megaphone size={16} aria-hidden />, href: postUrl, external: true }] : []),
    ...(canRemove(c)
      ? [{ label: "Remove creator", icon: <UserMinus size={16} aria-hidden />, danger: true, onSelect: () => onRemove(c.id) }]
      : []),
  ];
  return (
    <>
      <FaceAvatar id={creator.id} name="" size={40} />
      <span className="flex min-w-0 flex-1 flex-col">
        <Link
          href={paths.job(c.id)}
          className="y-small truncate font-medium outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:shadow-[inset_0_0_0_2px_var(--b-fg)]"
        >
          {creator.name}
          <span className="sr-only">, slot {slot}</span>
        </Link>
        <span className="y-micro y-fg-2 max-sm:line-clamp-2 sm:truncate">{slotMeta(c)}</span>
        {postsOn ? <span className="y-micro y-fg-2 max-sm:line-clamp-2 sm:truncate">{postsOn}</span> : null}
        <SlotBadge commission={c} side="business" className="relative z-[2] mt-1 w-fit sm:!hidden" />
        {postUrl ? (
          <a
            href={postUrl}
            target="_blank"
            rel="noreferrer"
            className="y-micro relative z-[2] inline-flex w-fit items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            {postLabel(postUrl)} <ArrowUpRight size={12} aria-hidden />
          </a>
        ) : null}
        {c.quickRating ? (
          <span className="mt-0.5 inline-flex sm:hidden">
            <StarRow value={c.quickRating} size={12} />
          </span>
        ) : null}
      </span>
      {c.quickRating ? (
        <span className="hidden flex-none sm:inline-flex">
          <StarRow value={c.quickRating} size={12} />
        </span>
      ) : null}
      <SlotBadge commission={c} side="business" className="relative z-[2] hidden flex-none sm:inline-flex" />
      <OverflowMenu label={`More for ${creator.firstName}, slot ${slot}`} items={items} tone="ghost" />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Side rail                                                                   */
/* -------------------------------------------------------------------------- */

function MoneyCard({ request }: { request: CampaignRequest }) {
  const s = useDemo();
  const totals = campaignMoney(s, request);
  const method = s.paymentMethods.find((m) => m.id === request.campaign.paymentMethodId);
  const ledger = [...request.campaign.ledger].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const [open, setOpen] = useState(false);
  const stats = [
    { label: "Held now", value: totals.held },
    { label: "Paid out", value: totals.released },
    { label: "Refunded", value: totals.refunded },
  ];
  return (
    <Block as="section" aria-labelledby="money-h" tone="paper" pad="md" className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 id="money-h" className="y-head flex items-center gap-2">
          <Wallet size={16} aria-hidden /> Money
        </h2>
        <p className="y-micro y-fg-2">
          {method ? `On ${paymentLabel(method)} · ` : ""}
          {money(totals.total)} in all, nothing added on top
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1">
            <dt className="y-micro y-fg-2">{stat.label}</dt>
            <dd className="y-display y-num text-[22px] leading-none">{moneyExact(stat.value)}</dd>
          </div>
        ))}
      </dl>
      <p className="y-micro y-fg-2">
        {totals.pending
          ? `Of the held money, ${money(totals.pending)} is for approved videos, paid out ${CAMPAIGN_RELEASE_DAYS} days after each post is verified. `
          : `Each slot is paid out ${CAMPAIGN_RELEASE_DAYS} days after its post is verified. `}
        {request.status === "closed" ? "Unpicked slots were refunded when it closed." : "Unpicked slots are refunded when it closes."}
      </p>
      {ledger.length ? (
        <div className="border-t border-(--b-line) pt-1">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="y-small flex min-h-11 w-full items-center gap-2 text-start font-medium"
          >
            <ChevronDown size={16} aria-hidden className={`flex-none transition-transform ${open ? "rotate-180" : ""}`} />
            <span className="flex-1">Money movements</span>
            <span className="y-micro y-fg-2 font-normal">{ledger.length}</span>
          </button>
          {open ? (
            <>
              <ul className="flex flex-col">
                {ledger.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3 border-b border-(--b-line) py-2.5 last:border-b-0">
                    <div className="min-w-0">
                      <p className="y-small">{entry.note}</p>
                      <p className="y-micro y-fg-2">
                        {shortDate(entry.at)} · {entry.kind === "refund" ? "Refunded" : entry.kind === "top_up" ? "Top-up held" : "Held"}
                      </p>
                    </div>
                    <span className="y-small y-num flex-none font-semibold">
                      {entry.kind === "refund" ? "−" : "+"}
                      {moneyExact(entry.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href={paths.billing} className="y-small y-fg-2 mt-2 inline-flex items-center gap-1 font-medium underline underline-offset-4">
                <CreditCard size={14} aria-hidden /> Receipts in Billing
              </Link>
            </>
          ) : null}
        </div>
      ) : null}
    </Block>
  );
}

function ToldCard({ request, onEdit }: { request: CampaignRequest; onEdit: () => void }) {
  const brief = request.brief;
  const terms = request.campaign;
  return (
    <Block as="section" aria-labelledby="told-h" tone="paper" pad="md" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="told-h" className="y-head">
          What creators were told
        </h2>
        <PillButton variant="ghost" size="sm" className="-me-3" icon={<Pencil size={14} aria-hidden />} onClick={onEdit}>
          Edit
        </PillButton>
      </div>
      {brief.keyMessage ? <p className="y-small font-medium">{brief.keyMessage}</p> : null}
      {brief.mustInclude.length ? (
        <RailSection title="Talking points">
          <Bullets items={brief.mustInclude} marker={<Check size={14} strokeWidth={2.75} aria-hidden className="mt-0.5 flex-none" />} />
        </RailSection>
      ) : null}
      {brief.avoid.length ? (
        <RailSection title="Restrictions">
          <Bullets items={brief.avoid} marker={<Ban size={14} strokeWidth={2.5} aria-hidden className="mt-0.5 flex-none" />} />
        </RailSection>
      ) : null}
      <KeyValues
        rows={[
          ...(brief.languages.length
            ? [{ label: "Language", value: brief.languages.map((id) => languageById[id].name).join(" or ") }]
            : []),
          ...terms.platforms.map((p) => ({ label: `Tag on ${campaignPlatformById[p].name}`, value: brandHandleFor(terms, p) })),
          { label: "Usage", value: `${usageById[brief.usage].name}, included` },
        ]}
      />
      {terms.explainer ? <ExplainerTile name={terms.explainer.name} durationSec={terms.explainer.durationSec} /> : null}
    </Block>
  );
}

function RulesCard({ request }: { request: CampaignRequest }) {
  const terms = request.campaign;
  const tier = tierById[terms.tierId];
  const rules = [
    {
      icon: <Users size={15} aria-hidden />,
      text: `Creators with ${tier.label} verified real followers on ${platformList(terms.platforms)}${terms.platforms.length > 1 ? " (each posts on one)" : ""}${terms.tierChangedAt && terms.previousTierId ? `, changed from ${tierById[terms.previousTierId].label} on ${shortDate(terms.tierChangedAt)}` : ""}.`,
    },
    { icon: <Clock size={15} aria-hidden />, text: deadlineRule(terms) },
    { icon: <Megaphone size={15} aria-hidden />, text: postingRule(terms) },
    { icon: <Wallet size={15} aria-hidden />, text: payRule() },
  ];
  return (
    <Block as="section" aria-labelledby="rules-h" tone="paper" pad="md" className="flex flex-col gap-3">
      <h2 id="rules-h" className="y-head">
        Rules
      </h2>
      <ul className="flex flex-col gap-2.5">
        {rules.map((rule) => (
          <li key={rule.text} className="y-small flex gap-2.5">
            <span className="mt-0.5 flex-none">{rule.icon}</span>
            <span className="min-w-0">{rule.text}</span>
          </li>
        ))}
      </ul>
    </Block>
  );
}
