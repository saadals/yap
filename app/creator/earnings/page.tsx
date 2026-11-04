"use client";

import { CheckCircle2, ChevronRight, Clock, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AddPayoutSheet, PayoutMethods } from "@/components/money/payout-methods";
import { PayoutSheet } from "@/components/money/payout-sheet";
import { AppShell } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { MiniBars } from "@/components/ui/charts";
import { Page, PageHeader, SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { money, plural, shortDate } from "@/lib/format";
import { businessById, commissionTotals, creatorEarnings } from "@/lib/selectors";
import { ME, useDemo, useHydrated } from "@/lib/store";

export default function EarningsPage() {
  return (
    <AppShell role="creator">
      <Earnings />
    </AppShell>
  );
}

function Earnings() {
  const s = useDemo();
  const hydrated = useHydrated();
  const [withdrawing, setWithdrawing] = useState(false);
  const [addingMethod, setAddingMethod] = useState(false);

  const earnings = creatorEarnings(s);
  const mine = s.commissions.filter((c) => c.creatorId === ME.creatorId);
  const held = mine.filter((c) => c.payment.status === "held");
  const released = mine
    .filter((c) => c.payment.status === "released")
    .sort((a, b) => Date.parse(b.completedAt ?? b.createdAt) - Date.parse(a.completedAt ?? a.createdAt));
  const payouts = [...s.payouts].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const defaultMethod = s.payoutMethods.find((m) => m.isDefault) ?? s.payoutMethods[0];
  const sixMonths = earnings.monthly.reduce((sum, value) => sum + value, 0);

  return (
    <Page>
      <PageHeader title="Earnings & payouts" description="You keep 100% of your price. Clients pay Yapp's fee on top." />

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
              <Wallet size={18} aria-hidden /> Available to withdraw
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

      <SectionLabel id="by-commission-title">Released to you</SectionLabel>
      <Block as="section" aria-labelledby="by-commission-title" tone="paper" pad="md">
        {!hydrated ? (
          <div className="flex flex-col gap-2" aria-hidden>
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-12 w-full !rounded-(--y-r-tile)" />
            ))}
          </div>
        ) : released.length === 0 ? (
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
                      href={`/creator/commissions/${c.id}`}
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
        )}
      </Block>

      <SectionLabel>Payouts</SectionLabel>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
        <Block
          as="section"
          aria-labelledby="history-title"
          tone="paper"
          pad="md"
          className="flex flex-col gap-3 lg:col-span-7"
        >
          <h3 id="history-title" className="y-head flex min-h-10 items-center">
            History
          </h3>
          {!hydrated ? (
            <Skeleton className="h-16 w-full !rounded-(--y-r-tile)" />
          ) : payouts.length === 0 ? (
            <p className="y-small y-fg-2">No payouts yet. Withdrawals show up here.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-(--b-line)" aria-live="polite">
              {payouts.map((payout) => {
                const method = s.payoutMethods.find((m) => m.id === payout.methodId);
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
