"use client";

import { ArrowRight, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { campaignStageIndex, stageIndex } from "@/components/domain/stage-track";
import { CommissionBadge, SlotBadge } from "@/components/domain/status-badge";
import { Block } from "@/components/ui/block";
import { List, Row } from "@/components/ui/list";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { ProgressBar } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { attention, type AttentionItem } from "@/lib/attention";
import { NOW, TZ_OFFSET } from "@/lib/clock";
import { dueLabel, money, plural, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import {
  businessById,
  commissionById,
  commissionsForCreator,
  creatorEarnings,
  isActive,
  me,
  pitchesForCreator,
} from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";
import type { Commission } from "@/lib/types";

import { WorkList, WorkRow } from "@/components/find-work/work-row";
import { sortItems, workItems } from "@/components/find-work/work-items";

import "@/app/styles/studio-work.css";

import { profileGaps } from "./profile-nudge";
import { StudioWelcome } from "./studio-welcome";

const NEEDS_SHOWN = 4;

/** "Good morning" by the demo clock (display time). */
function greeting(): string {
  const hour = new Date(NOW + TZ_OFFSET).getUTCHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/** A version due within three days (or late) needs you now; later ones are simply in progress. */
const dueSoon = (c?: Commission) => Boolean(c && dueLabel(c.dueDate).urgency !== "ok");

/**
 * Studio Home ("Today"): what needs you, money, what's in progress and work that fits you. At most
 * five blocks; each job appears once (a version due soon is in Needs you, later ones in progress).
 * Without a creator profile it's the Studio welcome, which sets one up.
 */
export function StudioToday() {
  const s = useDemo();
  const hydrated = useHydrated();
  const [showAll, setShowAll] = useState(false);

  if (!hydrated) return <TodaySkeleton />;
  const creator = me.creator(s);
  if (!creator) return <StudioWelcome />;

  const items = attention(s, "creator");
  const needs = items.filter(
    (item) => item.kind !== "deliver" || dueSoon(item.commissionId ? commissionById(s, item.commissionId) : undefined),
  );
  const listed = new Set(needs.map((n) => n.commissionId).filter(Boolean));
  const inProgress = commissionsForCreator(s).filter((c) => isActive(c) && !listed.has(c.id) && c.status !== "offered");
  const earnings = creatorEarnings(s);
  const fits = sortItems(
    workItems(s).filter((i) => !i.hidden && !i.pitch && !i.slot && (i.kind === "custom" || i.eligibility?.ok)),
    "fit",
  ).slice(0, 4);
  const gap = profileGaps(s, creator)[0];

  // A brand-new creator profile: nothing to catch up on, so the page says where to start.
  const fresh = !commissionsForCreator(s).length && !pitchesForCreator(s).length;
  const urgent = needs.filter((n) => n.tier <= 1).length;
  const summary = [
    urgent ? `${plural(urgent, "thing")} need${urgent === 1 ? "s" : ""} you today` : "Nothing urgent needs you today",
    inProgress.length
      ? `${inProgress.length === 1 ? "1 other job is" : `${inProgress.length} other jobs are`} moving along`
      : null,
  ]
    .filter(Boolean)
    .join(", and ");

  const shown = showAll ? needs : needs.slice(0, NEEDS_SHOWN);

  return (
    <Page>
      <PageHeader
        title={`${greeting()}, ${creator.firstName}`}
        description={fresh ? "Your creator profile is live. Here's work that fits you." : `${summary}.`}
      />

      <div className="grid grid-cols-1 gap-x-4 gap-y-8 lg:grid-cols-12 lg:items-start [&>*]:min-w-0">
        {/* Needs you */}
        <section aria-labelledby="needs-h" className="flex flex-col gap-3 lg:col-span-8">
          <h2 id="needs-h" className="y-head">
            Needs you
          </h2>
          {needs.length ? (
            <div data-tone="paper" className="y-block overflow-hidden">
              <div role="list" aria-label="Needs you" className="y-list">
                {shown.map((item, index) =>
                  index === 0 ? <TopRow key={`${item.kind}-${item.href}`} item={item} /> : <NeedRow key={`${item.kind}-${item.href}`} item={item} />,
                )}
              </div>
              {needs.length > NEEDS_SHOWN ? (
                <div className="border-t border-(--b-line) px-5 py-2">
                  <button type="button" className="y-small min-h-10 font-semibold" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                    {showAll ? "Show fewer" : `Show ${plural(needs.length - NEEDS_SHOWN, "more item")}`}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Block tone="paper" pad="md" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="y-body">
                {fresh
                  ? "Nothing here yet. Your first job starts with a pitch or a campaign slot."
                  : "You're all caught up. Nothing is waiting on you."}
              </p>
              <PillButton href={paths.findWork()} variant="neon" arrow className="flex-none">
                Find work
              </PillButton>
            </Block>
          )}
        </section>

        {/* Money (and the profile nudge): the side column on desktop, after Needs you on phones */}
        <aside aria-label="Money" className="flex flex-col gap-3 lg:col-span-4 lg:col-start-9 lg:row-span-3 lg:row-start-1">
          <h2 className="y-head lg:invisible" aria-hidden>
            Money
          </h2>
          <Block tone="paper" pad="md" className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="y-micro y-fg-2">Available to withdraw</p>
                <p className="y-display y-num text-[36px] leading-none font-normal tracking-[-0.03em]">
                  {money(earnings.available)}
                </p>
              </div>
              <span className="grid size-10 flex-none place-items-center rounded-full bg-(--y-mist)" aria-hidden>
                <Wallet size={18} />
              </span>
            </div>
            <MoneyLines earnings={earnings} />
            <Link href={paths.earnings} className="y-small inline-flex w-fit items-center gap-1.5 font-semibold">
              Earnings <ArrowRight size={15} aria-hidden className="y-flip" />
            </Link>
          </Block>
          {gap ? (
            <Link
              href={gap.href}
              className="y-tile flex items-center gap-3 px-4 py-3 transition-shadow hover:shadow-[inset_0_0_0_1px_var(--y-line-strong)]"
            >
              <Sparkles size={16} aria-hidden className="flex-none" />
              <span className="y-small min-w-0 flex-1">
                <span className="font-semibold">Stronger profile: </span>
                {gap.text}
              </span>
              <ArrowRight size={15} aria-hidden className="y-flip flex-none" />
            </Link>
          ) : null}
        </aside>

        {/* In progress */}
        {inProgress.length ? (
          <section aria-labelledby="progress-h" className="flex flex-col gap-3 lg:col-span-8">
            <div className="flex items-center justify-between gap-3">
              <h2 id="progress-h" className="y-head">
                In progress
              </h2>
              <Link href={paths.studioJobs()} className="y-small font-semibold">
                All jobs
              </Link>
            </div>
            <List label="In progress">
              {inProgress.map((c) => (
                <JobRow key={c.id} commission={c} />
              ))}
            </List>
          </section>
        ) : null}

        {/* Work that fits you */}
        <section aria-labelledby="fits-h" className="flex flex-col gap-3 lg:col-span-8">
          <div className="flex items-center justify-between gap-3">
            <h2 id="fits-h" className="y-head">
              Work that fits you
            </h2>
            <Link href={paths.findWork()} className="y-small font-semibold">
              Find work
            </Link>
          </div>
          {fits.length ? (
            <WorkList label="Work that fits you">
              {fits.map((item) => (
                <WorkRow key={item.id} item={item} compact />
              ))}
            </WorkList>
          ) : (
            <Block tone="paper" pad="md">
              <p className="y-small y-fg-2">
                Nothing new fits right now. New briefs and campaigns come in every week.
              </p>
            </Block>
          )}
        </section>
      </div>
    </Page>
  );
}

function MoneyLines({ earnings }: { earnings: ReturnType<typeof creatorEarnings> }) {
  const next = earnings.pendingItems.find((c) => c.post?.status === "live" && c.withdrawableFrom);
  const lines = [
    earnings.pending
      ? next
        ? `${money(earnings.pending)} pending · next release ${shortDate(next.withdrawableFrom!)}`
        : `${money(earnings.pending)} pending · released 7 days after your posts are verified`
      : null,
    earnings.held ? `${money(earnings.held)} held for jobs in progress` : null,
  ].filter(Boolean);
  if (!lines.length) return <p className="y-small y-fg-2">Paid out as brands approve your videos.</p>;
  return (
    <div className="flex flex-col gap-1 border-t border-(--b-line) pt-3">
      {lines.map((line) => (
        <p key={line} className="y-small y-num">
          {line}
        </p>
      ))}
    </div>
  );
}

/** The most urgent item: its action is the page's one green button. */
function TopRow({ item }: { item: AttentionItem }) {
  const s = useDemo();
  const business = item.businessId ? businessById(s, item.businessId) : undefined;
  return (
    <div role="listitem" className="y-row flex-wrap !items-start gap-y-3 sm:flex-nowrap sm:!items-center">
      {business ? <BusinessLogo business={business} size={40} /> : null}
      <div className="flex min-w-0 flex-1 basis-[calc(100%-60px)] flex-col gap-0.5 sm:basis-auto">
        <span className="y-eyebrow y-fg-2">{item.eyebrow}</span>
        <span className="font-semibold">{item.title}</span>
        <span className="y-small y-fg-2">{item.line}</span>
      </div>
      <PillButton href={item.href} variant="neon" arrow className="w-full flex-none justify-between ps-5 sm:w-auto">
        {item.action}
      </PillButton>
    </div>
  );
}

function NeedRow({ item }: { item: AttentionItem }) {
  const s = useDemo();
  const business = item.businessId ? businessById(s, item.businessId) : undefined;
  return (
    <Row
      href={item.href}
      lead={business ? <BusinessLogo business={business} size={36} /> : undefined}
      title={item.title}
      meta={item.line}
      end={<span className="y-small hidden font-semibold md:inline">{item.action}</span>}
    />
  );
}

function JobRow({ commission: c }: { commission: Commission }) {
  const s = useDemo();
  const business = businessById(s, c.businessId);
  const campaign = c.source === "campaign";
  const index = campaign ? campaignStageIndex(c.status, c.post) : stageIndex(c.status);
  const stages = campaign ? 5 : 4;
  const due = dueLabel(c.dueDate);
  const meta = [
    business?.name,
    c.status === "delivered" ? "waiting for their review" : c.status === "completed" ? "post it to get paid" : due.text,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Row
      href={paths.job(c.id)}
      lead={business ? <BusinessLogo business={business} size={36} /> : undefined}
      title={c.title}
      meta={meta}
      end={<span className="hidden sm:inline-flex">{campaign ? <SlotBadge commission={c} side="creator" /> : <CommissionBadge status={c.status} side="creator" />}</span>}
      below={<ProgressBar value={Math.max(0, index) / stages} label={`${c.title}: stage ${Math.max(0, index)} of ${stages}`} className="max-w-xs" />}
    />
  );
}

function TodaySkeleton() {
  return (
    <Page>
      <div aria-busy="true" aria-label="Loading Studio" className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-3 lg:col-span-8">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-40 w-full !rounded-(--y-r-block)" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-56 w-full !rounded-(--y-r-block)" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-44 w-full !rounded-(--y-r-block)" />
          </div>
        </div>
      </div>
    </Page>
  );
}
