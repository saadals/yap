"use client";

import "@/app/styles/studio-business.css";

import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Clock,
  Hourglass,
  Loader2,
  Megaphone,
  Plus,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { BusinessLogo } from "@/components/domain/business-logo";
import { ItemRow } from "@/components/studio-jobs/item-row";
import { SetupPrompt } from "@/components/studio-jobs/setup-prompt";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { List } from "@/components/ui/list";
import { Page, PageHeader, SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { autoApproveAt } from "@/lib/attention";
import { money, plural, shortDate, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { businessById, commissionTotals, creatorEarnings, me } from "@/lib/selectors";
import { type DemoState, useDemo, useHydrated } from "@/lib/store";
import { CAMPAIGN_KEEP_LIVE_DAYS, CAMPAIGN_RELEASE_DAYS, CAMPAIGN_RESTORE_HOURS } from "@/lib/taxonomy";
import type { Commission, Payout } from "@/lib/types";

import { AddPayoutSheet, PayoutMethodList, payoutLabel } from "./payout-methods";
import { PayoutSheet, arrivalDate } from "./payout-sheet";

/**
 * /studio/earnings: one clear top (what you can withdraw, and the one green button), then where
 * the rest of your money is: pending campaign pay with its release dates, money brands are
 * holding for your active jobs, totals, activity and payout methods. Each number appears once.
 */
export function EarningsPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const [setupOpen, setSetupOpen] = useState(false);

  if (!hydrated) return <EarningsSkeleton />;
  const creator = me.creator(s);

  return (
    <Page>
      <PageHeader title="Earnings" description={creator ? "You keep 100% of your price. Brands pay Yapp's fee." : undefined} />
      {creator ? (
        <EarningsBody key={creator.id} />
      ) : (
        <SetupPrompt
          title="Your earnings start with your first video"
          body="Set up a creator profile to pitch on orders and take campaign slots. What you earn lands here, and you keep 100% of your price."
          shape="pill"
          tint="sun"
          onSetUp={() => setSetupOpen(true)}
        />
      )}
      <CreatorSetupSheet open={setupOpen} onClose={() => setSetupOpen(false)} reason="to start earning" />
    </Page>
  );
}

const earned = (c: Commission) => commissionTotals(c).creatorEarns;

function EarningsBody() {
  const s = useDemo();
  const [withdrawing, setWithdrawing] = useState(false);
  const [adding, setAdding] = useState(false);
  const earnings = creatorEarnings(s);
  const creatorId = me.ids(s).creatorId;
  const mine = s.commissions.filter((c) => c.creatorId === creatorId);
  const held = mine
    .filter((c) => c.payment.status === "held")
    .sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate));

  return (
    <div className="grid grid-cols-1 items-start gap-x-6 lg:grid-cols-12 [&>*]:min-w-0">
      <div className="flex flex-col lg:col-span-8">
        <AvailableCard available={earnings.available} onWithdraw={() => setWithdrawing(true)} />
        <PendingSection s={s} items={earnings.pendingItems} total={earnings.pending} waiting={earnings.pendingWaiting} />
        <InProgressSection s={s} items={held} total={earnings.held} />
        <div className="lg:hidden">
          <TotalsCard earnings={earnings} id="totals-phone" />
        </div>
        <ActivitySection s={s} mine={mine} />
      </div>
      <aside className="flex flex-col lg:col-span-4" aria-label="Totals and payout methods">
        <div className="y-rail flex flex-col">
          <div className="hidden lg:block">
            <TotalsCard earnings={earnings} id="totals-title" />
          </div>
          <SectionLabel
            action={
              <PillButton variant="ghost" size="sm" className="-me-3" icon={<Plus size={16} aria-hidden />} onClick={() => setAdding(true)}>
                Add<span className="sr-only"> a payout method</span>
              </PillButton>
            }
          >
            Payout methods
          </SectionLabel>
          <PayoutMethodList onAdd={() => setAdding(true)} />
        </div>
      </aside>

      <PayoutSheet
        open={withdrawing}
        onClose={() => setWithdrawing(false)}
        available={earnings.available}
        onAddMethod={() => setAdding(true)}
      />
      <AddPayoutSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Available to withdraw                                                       */
/* -------------------------------------------------------------------------- */

function AvailableCard({ available, onWithdraw }: { available: number; onWithdraw: () => void }) {
  const s = useDemo();
  const methods = me.payoutMethods(s);
  const method = methods.find((m) => m.isDefault) ?? methods[0];
  return (
    <Block as="section" aria-labelledby="available-title" tone="paper" pad="lg" className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h2 id="available-title" className="y-small y-fg-2 font-medium">
          Available to withdraw
        </h2>
        <p className="y-display y-num text-[44px] leading-none tracking-[-0.035em] md:text-[56px]">{money(available)}</p>
        <p className="y-small y-fg-2 mt-2">
          {available <= 0
            ? "Nothing to withdraw yet. Approved work lands here."
            : method
              ? `Arrives by ${weekdayDate(arrivalDate())} · ${payoutLabel(method)}`
              : "Add a payout method to withdraw."}
        </p>
      </div>
      <PillButton variant="neon" size="lg" arrow disabled={available <= 0} onClick={onWithdraw} className="self-start sm:self-auto">
        Withdraw
      </PillButton>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Pending: approved campaign pay, released 7 days after the post is verified  */
/* -------------------------------------------------------------------------- */

function postChip(c: Commission) {
  const status = c.post?.status ?? "due";
  if (status === "live")
    return (
      <Badge tone="success" icon={<BadgeCheck size={14} aria-hidden />}>
        Post live
      </Badge>
    );
  if (status === "checking")
    return (
      <Badge tone="neutral" icon={<Loader2 size={14} aria-hidden />}>
        Checking post
      </Badge>
    );
  if (status === "removed")
    return (
      <Badge tone="danger" icon={<TriangleAlert size={14} aria-hidden />}>
        Post down
      </Badge>
    );
  return (
    <Badge tone="warning" icon={<Megaphone size={14} aria-hidden />}>
      Post due
    </Badge>
  );
}

/** When the money is released, or what's missing before it gets a date. */
function releaseLine(c: Commission): string {
  const status = c.post?.status ?? "due";
  if (status === "live" && c.withdrawableFrom) return `Released ${shortDate(c.withdrawableFrom)} if the post is still up`;
  if (status === "checking") return "Checking your post. The date follows";
  if (status === "removed") return `On hold: put the post back within ${CAMPAIGN_RESTORE_HOURS} hours`;
  return `Post it to start the ${CAMPAIGN_RELEASE_DAYS} days`;
}

function SectionHead({ id, title, total, hint }: { id: string; title: string; total?: number; hint: string }) {
  return (
    <div className="flex items-end justify-between gap-4 pt-8 pb-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 id={id} className="y-head">
          {title}
        </h2>
        <p className="y-small y-fg-2">{hint}</p>
      </div>
      {total !== undefined ? <p className="y-head y-num flex-none">{money(total)}</p> : null}
    </div>
  );
}

function PendingSection({
  s,
  items,
  total,
  waiting,
}: {
  s: DemoState;
  items: Commission[];
  total: number;
  waiting: number;
}) {
  return (
    <section aria-labelledby="pending-title">
      <SectionHead
        id="pending-title"
        title="Pending"
        total={items.length ? total : undefined}
        hint={`Approved campaign pay, released ${CAMPAIGN_RELEASE_DAYS} days after we verify your post.`}
      />
      {items.length ? (
        <>
          <List label="Pending campaign pay">
            {items.map((c) => {
              const business = businessById(s, c.businessId);
              return (
                <ItemRow
                  key={c.id}
                  href={paths.job(c.id)}
                  lead={business ? <BusinessLogo business={business} size={40} /> : null}
                  title={c.title}
                  meta={[business?.name, releaseLine(c)].filter(Boolean).join(" · ")}
                  chip={postChip(c)}
                  amount={money(earned(c))}
                />
              );
            })}
          </List>
          <p className="y-micro y-fg-2 flex items-start gap-1.5 px-1 pt-3">
            <Clock size={14} aria-hidden className="mt-px flex-none" />
            <span>
              {waiting > 0 ? `${money(waiting)} gets its date once the post is verified. ` : ""}
              Keep each post up for {CAMPAIGN_KEEP_LIVE_DAYS} days after it&apos;s verified.
            </span>
          </p>
        </>
      ) : (
        <QuietCard icon={<Hourglass size={18} aria-hidden />}>
          Nothing pending. When a brand approves your campaign video and we verify your post, its pay
          waits here for {CAMPAIGN_RELEASE_DAYS} days.
        </QuietCard>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* In progress: money brands are holding for your active jobs                  */
/* -------------------------------------------------------------------------- */

function heldLine(c: Commission): string {
  const campaign = c.source === "campaign";
  switch (c.status) {
    case "delivered":
      return campaign ? "In review · then pending" : `In review · released by ${weekdayDate(autoApproveAt(c))}`;
    case "revision":
      return "Changes requested · released on approval";
    case "disputed":
      return "In resolution · our team is helping";
    default:
      return campaign ? "Filming · pending once approved" : "In production · released on approval";
  }
}

function InProgressSection({ s, items, total }: { s: DemoState; items: Commission[]; total: number }) {
  return (
    <section aria-labelledby="held-title">
      <SectionHead
        id="held-title"
        title="In progress"
        total={items.length ? total : undefined}
        hint="Paid by the brand and held for you. It's released when they approve."
      />
      {items.length ? (
        <List label="Money held for your active jobs">
          {items.map((c) => {
            const business = businessById(s, c.businessId);
            return (
              <ItemRow
                key={c.id}
                href={paths.job(c.id)}
                lead={business ? <BusinessLogo business={business} size={40} /> : null}
                title={c.title}
                meta={[business?.name, heldLine(c)].filter(Boolean).join(" · ")}
                amount={money(earned(c))}
              />
            );
          })}
        </List>
      ) : (
        <QuietCard icon={<ShieldCheck size={18} aria-hidden />}>
          Nothing held right now. When a brand hires you, they pay up front and we hold it until they
          approve.
        </QuietCard>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Totals                                                                      */
/* -------------------------------------------------------------------------- */

function TotalsCard({ earnings, id }: { earnings: ReturnType<typeof creatorEarnings>; id: string }) {
  return (
    <Block as="section" aria-labelledby={id} tone="paper" pad="md" className="mt-8 lg:mt-0">
      <h2 id={id} className="sr-only">
        Totals
      </h2>
      <dl className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <dt className="y-small y-fg-2">Released this month</dt>
          <dd className="y-display y-num text-[26px] leading-none tracking-[-0.02em]">{money(earnings.thisMonth)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="y-small y-fg-2">Lifetime earnings</dt>
          <dd className="y-display y-num text-[26px] leading-none tracking-[-0.02em]">{money(earnings.lifetime)}</dd>
          <dd className="y-micro y-fg-2">{plural(earnings.completedCount, "job")} approved</dd>
        </div>
      </dl>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Activity: releases and payouts, newest first                                */
/* -------------------------------------------------------------------------- */

type Activity =
  | { kind: "release"; at: string; commission: Commission }
  | { kind: "payout"; at: string; payout: Payout };

const SHOWN = 6;

function ActivitySection({ s, mine }: { s: DemoState; mine: Commission[] }) {
  const [all, setAll] = useState(false);
  const methods = s.payoutMethods;
  const items: Activity[] = [
    ...mine
      .filter((c) => c.payment.status === "released")
      .map((commission) => ({
        kind: "release" as const,
        at: commission.source === "campaign" ? (commission.withdrawableFrom ?? commission.completedAt ?? commission.createdAt) : (commission.completedAt ?? commission.createdAt),
        commission,
      })),
    ...me.payouts(s).map((payout) => ({ kind: "payout" as const, at: payout.at, payout })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const shown = all ? items : items.slice(0, SHOWN);

  return (
    <section aria-labelledby="activity-title">
      <SectionLabel id="activity-title">Activity</SectionLabel>
      {items.length ? (
        <>
          <List label="Releases and payouts">
            {shown.map((item) => {
              if (item.kind === "release") {
                const c = item.commission;
                const business = businessById(s, c.businessId);
                return (
                  <ItemRow
                    key={`r-${c.id}`}
                    href={paths.job(c.id)}
                    lead={
                      <span aria-hidden className="y-tile grid size-10 place-items-center !rounded-full">
                        <ArrowDownLeft size={18} />
                      </span>
                    }
                    title={`Released by ${business?.name ?? "the brand"}`}
                    meta={`${c.title} · ${shortDate(item.at)}`}
                    amount={`+${money(earned(c))}`}
                  />
                );
              }
              const payout = item.payout;
              const method = methods.find((m) => m.id === payout.methodId);
              return (
                <ItemRow
                  key={`p-${payout.id}`}
                  lead={
                    <span aria-hidden className="y-tile grid size-10 place-items-center !rounded-full">
                      <ArrowUpRight size={18} />
                    </span>
                  }
                  title={`Payout to ${method?.label ?? "a removed payout method"}`}
                  meta={[method?.detail, shortDate(payout.at)].filter(Boolean).join(" · ")}
                  chip={
                    payout.status === "processing" ? (
                      <Badge tone="active" icon={<Clock size={14} aria-hidden />}>
                        Processing
                      </Badge>
                    ) : undefined
                  }
                  amount={`−${money(payout.amount)}`}
                />
              );
            })}
          </List>
          {items.length > SHOWN ? (
            <div className="flex justify-center pt-3">
              <PillButton variant="ghost" size="sm" onClick={() => setAll((v) => !v)} aria-expanded={all}>
                {all ? "Show less" : `Show all ${items.length}`}
              </PillButton>
            </div>
          ) : null}
        </>
      ) : (
        <QuietCard icon={<ArrowDownLeft size={18} aria-hidden />}>
          Nothing yet. When a brand approves your work, the release shows up here, and so do your
          payouts.
        </QuietCard>
      )}
    </section>
  );
}

function QuietCard({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Block tone="paper" pad="md" className="flex items-start gap-3">
      <span className="y-fg-2 mt-0.5 flex-none">{icon}</span>
      <p className="y-small y-fg-2">{children}</p>
    </Block>
  );
}

/** Placeholder in the page's shape until the saved demo state has loaded. */
export function EarningsSkeleton() {
  return (
    <Page>
      <div aria-busy="true" aria-label="Loading your earnings">
        <div className="pb-5 md:pb-6">
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12" aria-hidden>
          <div className="flex flex-col gap-6 lg:col-span-8">
            <div data-tone="paper" className="y-block y-pad-lg flex flex-col gap-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-12 w-48" />
            </div>
            <Skeleton className="h-40 w-full !rounded-(--y-r-block)" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-48 w-full !rounded-(--y-r-block)" />
          </div>
        </div>
      </div>
    </Page>
  );
}
