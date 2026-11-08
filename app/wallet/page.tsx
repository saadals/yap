"use client";

import { CheckCircle2, ChevronRight, Clock, Hourglass, Loader2, Lock, Megaphone, Wallet as WalletIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { AddPayoutSheet, PayoutMethods } from "@/components/money/payout-methods";
import { PayoutSheet } from "@/components/money/payout-sheet";
import { AppShell } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { MiniBars } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader, SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { money, plural, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { businessById, commissionTotals, creatorEarnings, me } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { useDemo, useHydrated } from "@/lib/store";
import type { Commission } from "@/lib/types";

export default function WalletPage() {
  return (
    <AppShell>
      <Wallet />
    </AppShell>
  );
}

function Wallet() {
  const s = useDemo();
  const hydrated = useHydrated();
  const creator = me.creator(s);
  if (hydrated && !creator) return <NoWallet />;
  // Keyed by account so the sheets and toggles reset when switching accounts.
  return <WalletBody key={s.activeAccountId} s={s} hydrated={hydrated} />;
}

/** Accounts without a creator profile: explain, and set one up in place. */
function NoWallet() {
  const [setup, setSetup] = useState(false);
  return (
    <Page>
      <PageHeader title="Wallet" />
      <Block tone="paper" pad="md">
        <EmptyState
          shape="pill"
          tint="sun"
          face="smile"
          title="Your wallet starts when you make your first video"
          body="Set up a creator profile to pitch on orders and take campaign slots. What you earn lands here, and you keep 100% of your price."
          action={
            <PillButton variant="neon" arrow onClick={() => setSetup(true)}>
              Set up your creator profile
            </PillButton>
          }
        />
      </Block>
      <CreatorSetupSheet
        open={setup}
        onClose={() => setSetup(false)}
        onDone={() => setSetup(false)}
        reason="to start earning"
      />
    </Page>
  );
}

const byNewest = (a: Commission, b: Commission) =>
  Date.parse(b.completedAt ?? b.createdAt) - Date.parse(a.completedAt ?? a.createdAt);

function WalletBody({ s, hydrated }: { s: DemoState; hydrated: boolean }) {
  const [withdrawing, setWithdrawing] = useState(false);
  const [addingMethod, setAddingMethod] = useState(false);

  const creatorId = me.ids(s).creatorId;
  const earnings = creatorEarnings(s);
  const mine = s.commissions.filter((c) => c.creatorId === creatorId);
  const held = mine.filter((c) => c.payment.status === "held");
  const methods = me.payoutMethods(s);
  const defaultMethod = methods.find((m) => m.isDefault) ?? methods[0];
  const sixMonths = earnings.monthly.reduce((sum, value) => sum + value, 0);

  return (
    <Page>
      <PageHeader title="Wallet" description="You keep 100% of your price. Withdraw what's available any time." />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
        {/* Hero: what you can take out today */}
        <Block
          as="section"
          aria-labelledby="available-title"
          tone="butter"
          pad="lg"
          className="flex flex-col justify-between gap-8 lg:col-span-7"
        >
          <div className="flex flex-col gap-2">
            <h2 id="available-title" className="y-small flex items-center gap-2 font-semibold">
              <WalletIcon size={18} aria-hidden /> Available to withdraw
            </h2>
            {hydrated ? (
              <p className="y-display y-num text-[64px] leading-[0.95] font-semibold tracking-[-0.045em] md:text-[88px]">
                {money(earnings.available)}
              </p>
            ) : (
              <Skeleton className="h-16 w-56 md:h-20" />
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <PillButton
              variant="neon"
              size="lg"
              arrow
              disabled={!hydrated || earnings.available <= 0}
              onClick={() => setWithdrawing(true)}
            >
              Withdraw
            </PillButton>
            <p className="y-micro y-fg-2">
              {earnings.available <= 0
                ? "Approved work lands here."
                : defaultMethod
                  ? `Arrives in 1–2 business days to ${defaultMethod.label}`
                  : "Add a payout method to withdraw"}
            </p>
          </div>
        </Block>

        {/* Everything else about the balance, in one quiet block */}
        <Block
          as="section"
          aria-label="Earnings summary"
          tone="paper"
          pad="md"
          className="flex flex-col justify-between gap-5 lg:col-span-5"
        >
          <dl className="flex flex-col divide-y divide-(--b-line)">
            <SummaryRow
              label="In protection"
              sub={
                held.length
                  ? `${plural(held.length, "commission")}, released on approval`
                  : "Secured by the client when you start"
              }
              value={money(earnings.held)}
              loading={!hydrated}
            />
            <SummaryRow label="Released this month" value={money(earnings.thisMonth)} loading={!hydrated} />
            <SummaryRow
              label="Lifetime"
              sub={`${plural(earnings.completedCount, "commission")} approved`}
              value={money(earnings.lifetime)}
              loading={!hydrated}
            />
          </dl>
          <div className="flex flex-col gap-2">
            <p className="y-micro y-fg-2 flex justify-between gap-2">
              <span>Last 6 months</span>
              <span>
                <span className="y-num font-semibold text-(--b-fg)">{hydrated ? money(sixMonths) : "…"}</span> released
              </span>
            </p>
            {hydrated ? (
              <>
                <MiniBars values={earnings.monthly} labels={earnings.monthLabels} className="!h-20 max-w-[280px]" />
                <table className="sr-only">
                  <caption>Earnings released per month, last 6 months</caption>
                  <thead>
                    <tr>
                      <th scope="col">Month</th>
                      <th scope="col">Released</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.monthly.map((value, index) => (
                      <tr key={earnings.monthLabels[index]}>
                        <th scope="row">{earnings.monthLabels[index]}</th>
                        <td>{money(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <Skeleton className="h-20 w-full" />
            )}
          </div>
        </Block>
      </div>

      <PendingBlock s={s} earnings={earnings} hydrated={hydrated} />

      <SectionLabel>History</SectionLabel>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
        <HistoryBlock s={s} hydrated={hydrated} mine={mine} />
        <Block as="section" aria-labelledby="payout-methods-title" tone="paper" pad="md" className="lg:col-span-5">
          {hydrated ? (
            <PayoutMethods titleId="payout-methods-title" onAdd={() => setAddingMethod(true)} />
          ) : (
            <Skeleton className="h-16 w-full !rounded-(--y-r-tile)" />
          )}
        </Block>
      </div>

      <PayoutSheet
        open={withdrawing}
        onClose={() => setWithdrawing(false)}
        available={earnings.available}
        onAddMethod={() => setAddingMethod(true)}
      />
      <AddPayoutSheet open={addingMethod} onClose={() => setAddingMethod(false)} />
    </Page>
  );
}

/* -------------------------------------------------------------------------- */
/* Pending: approved campaign videos, withdrawable at month end                */
/* -------------------------------------------------------------------------- */

function PostState({ c }: { c: Commission }) {
  const status = c.post?.status ?? "due";
  if (status === "live")
    return (
      <Badge tone="success" icon={<CheckCircle2 size={14} aria-hidden />}>
        Post live
      </Badge>
    );
  if (status === "checking")
    return (
      <Badge tone="info" icon={<Loader2 size={14} aria-hidden />}>
        Checking post
      </Badge>
    );
  if (status === "removed")
    return (
      <Badge tone="neutral" icon={<Lock size={14} aria-hidden />}>
        Locked
      </Badge>
    );
  return (
    <PillButton
      href={paths.commission(c.id)}
      variant="soft"
      size="sm"
      icon={<Megaphone size={16} aria-hidden />}
      className="relative z-[3]"
      aria-label={`Post due: post “${c.title}” to unlock it`}
    >
      Post due
    </PillButton>
  );
}

function PendingBlock({
  s,
  earnings,
  hydrated,
}: {
  s: DemoState;
  earnings: ReturnType<typeof creatorEarnings>;
  hydrated: boolean;
}) {
  const items = [...earnings.pendingItems].sort(byNewest);
  return (
    <Block as="section" aria-labelledby="pending-title" tone="paper" pad="md" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-0.5">
          <h2 id="pending-title" className="y-small flex items-center gap-2 font-semibold">
            <Hourglass size={18} aria-hidden /> Pending
          </h2>
          <p className="y-micro y-fg-2">Unlocks at month end if the post stays up</p>
        </div>
        {hydrated ? (
          <p className="y-display y-num text-[32px] leading-none font-semibold tracking-[-0.03em]">
            {money(earnings.pending)}
          </p>
        ) : (
          <Skeleton className="h-8 w-24" />
        )}
      </div>

      {!hydrated ? (
        <Skeleton className="h-12 w-full !rounded-(--y-r-tile)" />
      ) : items.length === 0 ? (
        <p className="y-small y-fg-2">
          Nothing pending. When a campaign approves your video, its price waits here until month end.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-(--b-line)">
          {items.map((c) => {
            const business = businessById(s, c.businessId);
            return (
              <li key={c.id} className="relative flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <Link
                    href={paths.commission(c.id)}
                    className="y-small block truncate font-semibold after:absolute after:inset-0 after:content-[''] hover:underline"
                  >
                    {c.title}
                  </Link>
                  <p className="y-micro y-fg-2 truncate">
                    {business?.name}
                    {c.withdrawableFrom ? ` · unlocks ${shortDate(c.withdrawableFrom)}` : ""}
                  </p>
                </div>
                <span className="y-small y-num flex-none font-semibold">{money(commissionTotals(c).creatorEarns)}</span>
                <span className="flex-none">
                  <PostState c={c} />
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {hydrated && earnings.pendingLocked > 0 ? (
        <p className="y-micro y-fg-2 flex items-start gap-1.5">
          <Clock size={14} aria-hidden className="mt-px flex-none" />
          {money(earnings.pendingLocked)} only unlocks if its post is live at month end. Posts that come
          down stay locked.
        </p>
      ) : null}
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* History: released earnings and payouts, one block                           */
/* -------------------------------------------------------------------------- */

function HistoryBlock({ s, hydrated, mine }: { s: DemoState; hydrated: boolean; mine: Commission[] }) {
  const [view, setView] = useState<"released" | "payouts">("released");
  const released = mine.filter((c) => c.payment.status === "released").sort(byNewest);
  const payouts = [...me.payouts(s)].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const methods = me.payoutMethods(s);

  return (
    <Block as="section" aria-label="History" tone="paper" pad="md" className="flex flex-col gap-4 lg:col-span-7">
      <SegmentedToggle
        label="Show"
        value={view}
        onChange={setView}
        options={[
          { value: "released", label: "Released to you" },
          { value: "payouts", label: "Payouts" },
        ]}
        className="self-start"
      />
      {!hydrated ? (
        <div className="flex flex-col gap-2" aria-hidden>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-12 w-full !rounded-(--y-r-tile)" />
          ))}
        </div>
      ) : view === "released" ? (
        released.length === 0 ? (
          <p className="y-small y-fg-2">
            Nothing released yet. When a client approves your delivery, the payment shows up here.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-(--b-line)">
            {released.map((c) => {
              const business = businessById(s, c.businessId);
              return (
                <li key={c.id} className="relative flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={paths.commission(c.id)}
                      className="y-small block truncate font-semibold after:absolute after:inset-0 after:content-[''] hover:underline"
                    >
                      {c.title}
                    </Link>
                    <p className="y-micro y-fg-2 truncate">
                      {business?.name} · {shortDate(c.completedAt ?? c.createdAt)}
                    </p>
                  </div>
                  <span className="y-small y-num flex-none font-semibold">
                    {money(commissionTotals(c).creatorEarns)}
                  </span>
                  <ChevronRight size={16} aria-hidden className="y-flip y-fg-3 flex-none" />
                </li>
              );
            })}
          </ul>
        )
      ) : payouts.length === 0 ? (
        <p className="y-small y-fg-2">No payouts yet. Withdrawals show up here.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-(--b-line)" aria-live="polite">
          {payouts.map((payout) => {
            const method = methods.find((m) => m.id === payout.methodId);
            return (
              <li key={payout.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="y-small y-num font-semibold">{money(payout.amount)}</p>
                  <p className="y-micro y-fg-2 truncate">
                    {method ? method.label : "Payout method removed"} · {shortDate(payout.at)}
                  </p>
                </div>
                {payout.status === "paid" ? (
                  <span className="y-micro y-fg-2 flex flex-none items-center gap-1">
                    <CheckCircle2 size={14} aria-hidden /> Paid
                  </span>
                ) : (
                  <Badge tone="info" icon={<Clock size={14} aria-hidden />} className="!min-h-6 !px-2 text-xs">
                    Processing
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Block>
  );
}

function SummaryRow({
  label,
  sub,
  value,
  loading,
}: {
  label: string;
  sub?: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0">
      <dt className="min-w-0">
        <span className="y-small block font-semibold">{label}</span>
        {sub ? <span className="y-micro y-fg-2 block">{sub}</span> : null}
      </dt>
      <dd className="y-display y-num flex-none text-[24px] font-semibold tracking-[-0.02em]">
        {loading ? <Skeleton className="h-7 w-20" /> : value}
      </dd>
    </div>
  );
}
