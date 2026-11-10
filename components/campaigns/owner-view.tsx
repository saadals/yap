"use client";

import {
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Check,
  Clock,
  Lightbulb,
  Link2,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Play,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  UserMinus,
  UserPlus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { paymentLabel } from "@/components/domain/money";
import { RequestBadge, SlotBadge } from "@/components/domain/status-badge";
import { Block } from "@/components/ui/block";
import { StackedBar } from "@/components/ui/charts";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { BackPill, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { money, plural, shortDate, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import {
  brandHandleFor,
  campaignMoney,
  campaignProgress,
  campaignSlots,
  creatorById,
  productById,
  slotPlatform,
} from "@/lib/selectors";
import { absoluteUrl } from "@/lib/site";
import { useDemo } from "@/lib/store";
import {
  CAMPAIGN_MAX_REASSIGNMENTS,
  campaignPlatformById,
  languageById,
  tierById,
  usageById,
} from "@/lib/taxonomy";
import type { Commission } from "@/lib/types";

import { ExplainerTile } from "./explainer";
import {
  ChangeTierSheet,
  CloseCampaignSheet,
  EditCampaignSheet,
  LearningSheet,
  RaisePriceSheet,
  RemoveCreatorSheet,
  type CampaignRequest,
} from "./owner-sheets";
import { ActionList, Bullets, Disclosure, RowMenu, type MenuItem } from "./parts";
import { deadlineLine, followersOn, perYapp, postingRule } from "./shared";

type SheetKind = "more" | "tier" | "price" | "close" | "edit" | "learning";

/** Remove is only for a creator who hasn't uploaded anything yet. */
const canRemove = (c: Commission) => c.status === "in_progress" && c.deliveries.length === 0;

/** The owner's campaign page: progress, slots, money, and the brief behind a click. */
export function OwnerView({ request }: { request: CampaignRequest }) {
  const s = useDemo();
  const toast = useToast();
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const terms = request.campaign;
  const product = productById(s, request.brief.productId);
  const tier = tierById[terms.tierId];
  const closed = request.status === "closed";
  const feedHref = paths.reel(request.id);

  const copyLink = async () => {
    const url = absoluteUrl(paths.order(request.id));
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: "Link copied" });
    } catch {
      toast({ message: `Couldn't copy. The link is ${url}`, tone: "info" });
    }
  };

  const moreItems: MenuItem[] = [
    {
      label: "Change tier",
      icon: <SlidersHorizontal size={18} aria-hidden />,
      disabled: terms.tierChangedAt
        ? `Tier already changed ${shortDate(terms.tierChangedAt)}`
        : closed
          ? "The campaign is closed"
          : undefined,
      onSelect: () => setSheet("tier"),
    },
    {
      label: "Raise price",
      icon: <TrendingUp size={18} aria-hidden />,
      disabled: closed ? "The campaign is closed" : undefined,
      onSelect: () => setSheet("price"),
    },
    { label: "Edit details", icon: <Pencil size={18} aria-hidden />, onSelect: () => setSheet("edit") },
    {
      label: "Run again",
      icon: <RotateCcw size={18} aria-hidden />,
      href: paths.newOrder({ type: "campaign", again: request.id }),
    },
    ...(product
      ? [{ label: "Save a learning", icon: <Lightbulb size={18} aria-hidden />, onSelect: () => setSheet("learning") }]
      : []),
    {
      label: "Share link",
      icon: <Link2 size={18} aria-hidden />,
      onSelect: () => {
        setSheet(null);
        void copyLink();
      },
    },
    ...(closed
      ? []
      : [{ label: "Close campaign", icon: <Ban size={18} aria-hidden />, onSelect: () => setSheet("close") }]),
  ];

  const price = terms.postedPrice
    ? `${perYapp(terms.pricePerVideo)} (raised from ${money(terms.postedPrice)})`
    : perYapp(terms.pricePerVideo);
  const meta = [
    product?.name,
    terms.platforms.map((p) => `${campaignPlatformById[p].name} ${brandHandleFor(terms, p)}`).join(", "),
    tier.label,
    price,
  ]
    .filter(Boolean)
    .join(" · ");

  const removing = removeId ? s.commissions.find((c) => c.id === removeId) : undefined;
  const removingCreator = removing ? creatorById(s, removing.creatorId) : undefined;

  return (
    <div className="flex flex-col gap-2">
      <BackPill href={paths.work("ordered")} label="Work" className="!mb-0 w-fit" />
      <PageHeader
        title={<span className="block max-w-[24ch]">{request.title}</span>}
        description={
          <span className="flex flex-col items-start gap-2">
            <RequestBadge status={request.status} campaign />
            <span className="y-small">{meta}</span>
          </span>
        }
        className="!pb-3"
        actions={
          <>
            {closed ? null : (
              <PillButton href={feedHref} variant="outline" icon={<Play size={16} aria-hidden />}>
                See in feed
              </PillButton>
            )}
            <PillButton
              variant="outline"
              icon={<MoreHorizontal size={18} aria-hidden />}
              onClick={() => setSheet("more")}
              aria-haspopup="dialog"
            >
              More
            </PillButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:items-start [&>*]:min-w-0">
        <div className="flex flex-col gap-2 lg:col-span-8">
          <ProgressBlock request={request} />
          <SlotsBlock request={request} onRemove={setRemoveId} />
        </div>
        <div className="flex flex-col gap-2 lg:col-span-4">
          <MoneyBlock request={request} />
          <BriefBlock request={request} />
        </div>
      </div>

      {sheet === "more" ? (
        <Sheet open onClose={() => setSheet(null)} title="More" description={request.title} side="center" width="sm">
          <ActionList items={moreItems} />
        </Sheet>
      ) : null}
      {sheet === "tier" ? <ChangeTierSheet request={request} onClose={() => setSheet(null)} /> : null}
      {sheet === "price" ? <RaisePriceSheet request={request} onClose={() => setSheet(null)} /> : null}
      {sheet === "close" ? <CloseCampaignSheet request={request} onClose={() => setSheet(null)} /> : null}
      {sheet === "edit" ? <EditCampaignSheet request={request} onClose={() => setSheet(null)} /> : null}
      {sheet === "learning" && product ? (
        <LearningSheet productId={product.id} productName={product.name} onClose={() => setSheet(null)} />
      ) : null}
      {removing && removingCreator ? (
        <RemoveCreatorSheet commission={removing} creator={removingCreator} closed={closed} onClose={() => setRemoveId(null)} />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */

function Swatch({ color, hollow = false }: { color: string; hollow?: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2.5 flex-none rounded-full"
      style={hollow ? { boxShadow: `inset 0 0 0 1.5px ${color}` } : { background: color }}
    />
  );
}

function ProgressBlock({ request }: { request: CampaignRequest }) {
  const s = useDemo();
  const progress = campaignProgress(s, request);
  const slots = campaignSlots(s, request);
  const firstReview = slots.find((v) => v.commission?.status === "delivered")?.commission;
  const closed = request.status === "closed";
  const posted = progress.postsLive;
  const approvedOnly = progress.approved - posted;
  const inWork = progress.taken - progress.approved;
  const legend = [
    { label: "posted", value: posted, color: "var(--b-fg)" },
    { label: "approved", value: approvedOnly, color: "color-mix(in srgb, var(--b-fg) 58%, transparent)" },
    { label: "in progress", value: inWork, color: "color-mix(in srgb, var(--b-fg) 30%, transparent)" },
    { label: closed ? "refunded" : "open", value: progress.open, color: "var(--b-line)", hollow: true },
  ];
  const summary = `${progress.taken} of ${progress.total} slots taken: ${legend
    .map((item) => `${item.value} ${item.label}`)
    .join(", ")}`;

  return (
    <Block as="section" aria-labelledby="progress-h" tone="paper" pad="md" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="progress-h" className="y-micro y-fg-2">
            Slots taken
          </h2>
          <p className="flex items-baseline gap-2">
            <span className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]">
              {progress.taken}
            </span>
            <span className="y-head">of {progress.total}</span>
          </p>
        </div>
        {firstReview ? (
          <PillButton
            href={paths.commission(firstReview.id)}
            variant="neon"
            size="lg"
            arrow
            className="justify-between ps-6 max-sm:w-full"
          >
            Review {plural(progress.review, "copy", "copies")}
          </PillButton>
        ) : null}
      </div>
      <StackedBar
        label={summary}
        segments={legend.map((item) => ({ value: item.value, color: item.color }))}
      />
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-hidden>
        {legend.map((item) => (
          <li key={item.label} className="y-small inline-flex items-center gap-1.5">
            <Swatch color={item.hollow ? "var(--b-fg-3)" : item.color} hollow={item.hollow} />
            <span className="y-num font-semibold">{item.value}</span> {item.label}
          </li>
        ))}
      </ul>
      <p className="y-small y-fg-2 border-t border-(--b-line) pt-3">
        {closed
          ? "Closed. Unpicked slots were refunded; creators already filming carry on."
          : `Open until ${weekdayDate(request.campaign.closesAt)}, unless you close it sooner.`}
      </p>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Slots                                                                       */
/* -------------------------------------------------------------------------- */

function SlotsBlock({ request, onRemove }: { request: CampaignRequest; onRemove: (commissionId: string) => void }) {
  const s = useDemo();
  const slots = campaignSlots(s, request);
  const closed = request.status === "closed";
  const history = slots.flatMap((view) => view.previous.map((c) => ({ slot: view.slot, commission: c })));

  return (
    <Block as="section" aria-labelledby="slots-h" tone="paper" pad="none" className="flex flex-col p-2 md:p-3">
      <h2 id="slots-h" className="y-head px-3 pt-3 pb-2">
        Creators
      </h2>
      <ul className="flex flex-col">
        {slots.map((view) => {
          const c = view.commission;
          const creator = c ? creatorById(s, c.creatorId) : undefined;
          if (!c || !creator) {
            return (
              <li key={view.slot} className="flex min-h-16 items-center gap-3 px-3 py-2">
                <span
                  aria-hidden
                  className="grid size-11 flex-none place-items-center rounded-full border-2 border-dashed border-(--b-line) text-(--b-fg-3)"
                >
                  <UserPlus size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="y-small font-semibold">Slot {view.slot}</p>
                  <p className="y-micro y-fg-2">{closed ? "Closed · refunded" : "Open · waiting for a creator"}</p>
                </div>
              </li>
            );
          }
          const followers = followersOn(creator, slotPlatform(c, request));
          const items: MenuItem[] = [
            { label: "View profile", icon: <UserRound size={18} aria-hidden />, href: paths.creator(creator.handle) },
            { label: "Open", icon: <ArrowUpRight size={18} aria-hidden />, href: paths.commission(c.id) },
            ...(canRemove(c)
              ? [{ label: "Remove creator", icon: <UserMinus size={18} aria-hidden />, onSelect: () => onRemove(c.id) }]
              : []),
          ];
          return (
            <li
              key={view.slot}
              className="relative flex min-h-16 items-center gap-3 rounded-(--y-r-tile) px-3 py-2 transition-colors hover:bg-(--b-chip)"
            >
              <FaceAvatar id={creator.id} name="" size={44} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link
                  href={paths.commission(c.id)}
                  className="y-small block truncate font-semibold outline-none after:absolute after:inset-0 after:rounded-(--y-r-tile) after:content-[''] focus-visible:after:shadow-[inset_0_0_0_2px_var(--b-fg)]"
                >
                  {creator.name}
                  <span className="sr-only">, slot {view.slot}</span>
                </Link>
                <p className="y-micro y-fg-2 flex items-center gap-1">
                  Slot {view.slot} · {followers.text}
                  {followers.verified ? <BadgeCheck size={13} aria-label="verified" className="flex-none" /> : null}
                </p>
                <SlotBadge commission={c} side="business" className="w-fit sm:hidden" />
              </div>
              <SlotBadge commission={c} side="business" className="hidden flex-none sm:inline-flex" />
              <RowMenu label={`More for ${creator.firstName}`} items={items} />
            </li>
          );
        })}
      </ul>
      {history.length ? (
        <div className="mx-3 mt-1 border-t border-(--b-line) pt-1 pb-1">
          <Disclosure
            summary="Show history"
            hint={
              CAMPAIGN_MAX_REASSIGNMENTS !== null
                ? `${history.length} of ${CAMPAIGN_MAX_REASSIGNMENTS} reassignments`
                : plural(history.length, "earlier creator")
            }
          >
            <ul className="flex flex-col pb-2">
              {history.map(({ slot, commission }) => {
                const creator = creatorById(s, commission.creatorId);
                return (
                  <li key={commission.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                    <FaceAvatar id={commission.creatorId} name="" size={32} />
                    <Link
                      href={paths.commission(commission.id)}
                      className="y-small min-w-0 flex-1 font-semibold underline-offset-4 hover:underline"
                    >
                      {creator?.name ?? "A creator"}
                      <span className="y-fg-2 font-normal"> · Slot {slot}</span>
                    </Link>
                    <SlotBadge commission={commission} side="business" />
                  </li>
                );
              })}
            </ul>
          </Disclosure>
        </div>
      ) : null}
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Money                                                                       */
/* -------------------------------------------------------------------------- */

function MoneyBlock({ request }: { request: CampaignRequest }) {
  const s = useDemo();
  const totals = campaignMoney(s, request);
  const method = s.paymentMethods.find((m) => m.id === request.campaign.paymentMethodId);
  const ledger = [...request.campaign.ledger].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const stats = [
    { label: "Held now", value: totals.held },
    { label: "Released", value: totals.released },
    { label: "Refunded", value: totals.refunded },
  ];
  return (
    <Block as="section" aria-labelledby="money-h" tone="paper" pad="md" className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 id="money-h" className="y-head">
          Money
        </h2>
        <p className="y-micro y-fg-2">
          {method ? `On ${paymentLabel(method)} · ` : ""}Total {money(totals.total)}, nothing added on top
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1">
            <dt className="y-micro y-fg-2">{stat.label}</dt>
            <dd className="y-display y-num text-[24px] leading-none font-semibold tracking-[-0.02em]">
              {money(stat.value)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="y-small y-fg-2">
        {request.status === "closed"
          ? "Each slot is paid out after you approve its video. Unpicked slots were refunded when the campaign closed."
          : "The full amount is held when you post. Each slot is paid out after you approve its video. Unpicked slots are refunded when the campaign closes."}
      </p>
      {ledger.length ? (
        <div className="border-t border-(--b-line) pt-1">
          <Disclosure summary="See all money movements">
            <ul className="flex flex-col">
              {ledger.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 border-b border-(--b-line) py-2.5 last:border-b-0">
                  <div className="min-w-0">
                    <p className="y-small">{entry.note}</p>
                    <p className="y-micro y-fg-2">
                      {shortDate(entry.at)} · {entry.kind === "refund" ? "Refund" : entry.kind === "top_up" ? "Top-up held" : "Held"}
                    </p>
                  </div>
                  <span className="y-small y-num flex-none font-semibold">
                    {entry.kind === "refund" ? "−" : "+"}
                    {money(entry.amount, !Number.isInteger(entry.amount))}
                  </span>
                </li>
              ))}
            </ul>
            <Link href={paths.billing} className="y-small y-fg-2 mt-2 inline-block font-medium underline underline-offset-4">
              Receipts in Billing
            </Link>
          </Disclosure>
        </div>
      ) : null}
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Brief (behind a click)                                                      */
/* -------------------------------------------------------------------------- */

function BriefBlock({ request }: { request: CampaignRequest }) {
  const s = useDemo();
  const terms = request.campaign;
  const product = productById(s, request.brief.productId);
  const brief = request.brief;
  return (
    <Block as="section" aria-label="Brief" tone="paper" pad="md">
      <Disclosure summary={<span className="y-head">Brief</span>} hint={plural(brief.mustInclude.length, "talking point")}>
        <div className="flex flex-col gap-5 pt-2">
          {brief.keyMessage ? (
            <div className="flex flex-col gap-1">
              <h3 className="y-micro y-fg-2">{product ? `${product.name}: the key message` : "Key message"}</h3>
              <p className="y-body max-w-[62ch]">{brief.keyMessage}</p>
            </div>
          ) : null}
          {brief.mustInclude.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="y-micro y-fg-2">Talking points</h3>
              <Bullets items={brief.mustInclude} marker={<Check size={16} strokeWidth={2.75} aria-hidden className="mt-0.5 flex-none" />} />
            </div>
          ) : null}
          {brief.avoid.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="y-micro y-fg-2">Restrictions</h3>
              <Bullets items={brief.avoid} marker={<Ban size={16} strokeWidth={2.5} aria-hidden className="mt-0.5 flex-none" />} />
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <h3 className="y-micro y-fg-2">Posting rule</h3>
            <p className="y-small flex gap-2">
              <Megaphone size={16} aria-hidden className="mt-0.5 flex-none" />
              {postingRule(terms)}
            </p>
            <p className="y-small flex gap-2">
              <Clock size={16} aria-hidden className="mt-0.5 flex-none" />
              {deadlineLine(terms)}
            </p>
          </div>
          <p className="y-small">
            <span className="y-fg-2">Usage: </span>
            {usageById[brief.usage].name}, included in the price. Raw footage included.
          </p>
          {brief.languages.length ? (
            <p className="y-small">
              <span className="y-fg-2">Languages: </span>
              {brief.languages.map((id) => languageById[id].name).join(", ")}
            </p>
          ) : null}
          {terms.explainer ? <ExplainerTile name={terms.explainer.name} durationSec={terms.explainer.durationSec} /> : null}
        </div>
      </Disclosure>
    </Block>
  );
}
