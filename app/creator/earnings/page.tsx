"use client";

import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lock,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { CommissionBadge } from "@/components/domain/status-badge";
import { KpiBlock } from "@/components/money/kpi";
import {
  AddPayoutSheet,
  PayoutMethodIcon,
  PayoutMethods,
  payoutLabel,
} from "@/components/money/payout-methods";
import { PayoutSheet } from "@/components/money/payout-sheet";
import { AppShell } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { MiniBars } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader, SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { NOW_ISO } from "@/lib/clock";
import { money, monthYearOf, plural, shortDate } from "@/lib/format";
import { businessById, commissionTotals, creatorEarnings } from "@/lib/selectors";
import { ME, useDemo, useHydrated } from "@/lib/store";
import { AUTO_APPROVE_DAYS } from "@/lib/taxonomy";
import type { Payout } from "@/lib/types";

export default function EarningsPage() {
  return (
    <AppShell role="creator">
      <Earnings />
    </AppShell>
  );
}

function PayoutBadge({ status }: { status: Payout["status"] }) {
  return status === "paid" ? (
    <Badge tone="success" icon={<CheckCircle2 size={14} aria-hidden />}>
      Paid
    </Badge>
  ) : (
    <Badge tone="info" icon={<Clock size={14} aria-hidden />}>
      Processing
    </Badge>
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
      <PageHeader
        title="Earnings & payouts"
        description="You keep 100% of your price. Clients pay Yapp's fee on top, so what you quote is what you earn."
      />

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
            <p className="y-small y-fg-2 max-w-[46ch]">
              From {plural(earnings.completedCount, "approved commission")}, minus what you&apos;ve
              already withdrawn.
            </p>
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
            <p className="y-micro y-fg-2 flex items-center gap-1.5">
              <CalendarDays size={14} aria-hidden className="flex-none" />
              {earnings.available <= 0
                ? "Nothing to withdraw yet. Approved work lands here."
                : defaultMethod
                  ? `Arrives in 1–2 business days to ${payoutLabel(defaultMethod)}`
                  : "Add a payout method to withdraw"}
            </p>
          </div>
        </Block>

        {/* Protection: secured but not yet released */}
        <Block
          as="section"
          aria-labelledby="protection-title"
          tone="sky"
          pad="md"
          className="flex flex-col gap-4 lg:col-span-5"
        >
          <div className="flex flex-col gap-1.5">
            <h2 id="protection-title" className="y-small flex items-center gap-2 font-semibold">
              <ShieldCheck size={18} aria-hidden /> In protection
            </h2>
            {hydrated ? (
              <p className="y-display y-num text-[40px] leading-none font-semibold tracking-[-0.04em] md:text-[44px]">
                {money(earnings.held)}
              </p>
            ) : (
              <Skeleton className="h-11 w-36" />
            )}
            <p className="y-micro y-fg-2">
              Secured by the client before you started. Released when they approve, or automatically{" "}
              {AUTO_APPROVE_DAYS} days after you deliver.
            </p>
          </div>
          {hydrated && held.length ? (
            <ul className="flex flex-col gap-1.5" aria-label="Payments in protection">
              {held.map((c) => {
                const business = businessById(s, c.businessId);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/creator/commissions/${c.id}`}
                      className="y-tile y-hoverable flex items-center gap-3 p-2.5 pe-3"
                    >
                      {business ? <BusinessLogo business={business} size={36} /> : null}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="y-small truncate font-semibold">{c.title}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="y-micro y-fg-2 truncate">{business?.name}</span>
                          <CommissionBadge status={c.status} className="!min-h-5 !px-1.5 text-[11px]" />
                        </span>
                      </span>
                      <span className="y-small y-num flex-none font-semibold">
                        {money(commissionTotals(c).creatorEarns)}
                      </span>
                      <ChevronRight size={16} aria-hidden className="y-flip flex-none" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : hydrated ? (
            <p className="y-small">
              Nothing in protection right now. When you accept an offer or get hired, the client&apos;s
              payment is secured here first.
            </p>
          ) : null}
        </Block>

        <div className="grid grid-cols-2 gap-2 lg:col-span-5">
          <KpiBlock
            label="Lifetime earnings"
            icon={<TrendingUp size={16} aria-hidden />}
            value={money(earnings.lifetime)}
            loading={!hydrated}
            sub={`${plural(earnings.completedCount, "commission")} approved`}
          />
          <KpiBlock
            tone="night"
            label="This month"
            icon={<CalendarDays size={16} aria-hidden />}
            value={money(earnings.thisMonth)}
            loading={!hydrated}
            sub={`Released in ${monthYearOf(NOW_ISO)}`}
          />
        </div>

        <Block
          as="section"
          aria-labelledby="trend-title"
          tone="paper"
          pad="md"
          className="flex flex-col gap-4 lg:col-span-7"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="trend-title" className="y-head">
              Last 6 months
            </h2>
            <p className="y-small y-fg-2">
              <span className="y-num font-semibold text-(--b-fg)">{money(sixMonths)}</span> released
            </p>
          </div>
          {hydrated ? (
            <>
              <MiniBars values={earnings.monthly} labels={earnings.monthLabels} />
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
            <Skeleton className="h-28 w-full" />
          )}
        </Block>
      </div>

      <SectionLabel id="by-commission-title">Earnings by commission</SectionLabel>
      <Block as="section" aria-labelledby="by-commission-title" tone="paper" pad="md">
        {!hydrated ? (
          <div className="flex flex-col gap-2" aria-hidden>
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-16 w-full !rounded-(--y-r-tile)" />
            ))}
          </div>
        ) : released.length === 0 ? (
          <EmptyState
            title="No released payments yet"
            body="When a client approves your delivery, the payment is released and listed here."
            shape="dome"
            tint="sun"
            face="calm"
            headingLevel={3}
            action={
              <PillButton href="/creator/opportunities" variant="contrast" size="sm">
                Find opportunities
              </PillButton>
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-(--b-line)">
            {released.map((c) => {
              const business = businessById(s, c.businessId);
              return (
                <li key={c.id} className="relative flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {business ? <BusinessLogo business={business} size={40} /> : null}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/creator/commissions/${c.id}`}
                      className="y-small block truncate font-semibold after:absolute after:inset-0 after:content-[''] hover:underline"
                    >
                      {c.title}
                    </Link>
                    <p className="y-micro y-fg-2 truncate">
                      {business?.name} · Released {shortDate(c.completedAt ?? c.createdAt)}
                    </p>
                  </div>
                  <span className="y-display y-num flex-none text-xl font-semibold tracking-[-0.02em]">
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
          className="flex flex-col gap-4 lg:col-span-7"
        >
          <h3 id="history-title" className="y-display y-title">
            Payout history
          </h3>
          {!hydrated ? (
            <Skeleton className="h-16 w-full !rounded-(--y-r-tile)" />
          ) : payouts.length === 0 ? (
            <p className="y-small y-fg-2">
              No payouts yet. Withdraw your available balance and it will show up here.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-(--b-line)" aria-live="polite">
              {payouts.map((payout) => {
                const method = s.payoutMethods.find((m) => m.id === payout.methodId);
                return (
                  <li key={payout.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span aria-hidden className="y-tile grid size-10 flex-none place-items-center !rounded-full">
                      <PayoutMethodIcon kind={method?.kind ?? "bank"} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="y-small y-num font-semibold">{money(payout.amount)}</p>
                      <p className="y-micro y-fg-2 truncate">
                        {method ? payoutLabel(method) : "Payout method removed"} ·{" "}
                        {shortDate(payout.at)}
                      </p>
                    </div>
                    <PayoutBadge status={payout.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </Block>
        <Block
          as="section"
          aria-labelledby="payout-methods-title"
          tone="paper"
          pad="md"
          className="flex flex-col gap-4 lg:col-span-5"
        >
          <div className="flex flex-col gap-1">
            <h3 id="payout-methods-title" className="y-display y-title">
              Payout methods
            </h3>
            <p className="y-small y-fg-2">Withdrawals go to your default unless you pick another.</p>
          </div>
          {hydrated ? (
            <PayoutMethods onAdd={() => setAddingMethod(true)} />
          ) : (
            <Skeleton className="h-16 w-full !rounded-(--y-r-tile)" />
          )}
        </Block>
      </div>

      <SectionLabel>How you get paid</SectionLabel>
      <Block as="section" aria-label="How you get paid" tone="mist" pad="md" className="flex flex-col gap-5">
        <p className="y-display y-title max-w-[40ch]">
          You keep 100% of your price. Payment is secured before you start and released when the
          client approves (or automatically {AUTO_APPROVE_DAYS} days after delivery).
        </p>
        <ol className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {[
            {
              icon: <Lock size={18} aria-hidden />,
              title: "Secured",
              body: "The client's payment is held by Yapp the moment you're hired or accept an offer.",
            },
            {
              icon: <BadgeCheck size={18} aria-hidden />,
              title: "Released",
              body: `Approval releases it to your balance. No reply in ${AUTO_APPROVE_DAYS} days? It releases automatically.`,
            },
            {
              icon: <Wallet size={18} aria-hidden />,
              title: "Withdrawn",
              body: "Withdraw any time to your bank or wallet. It arrives in 1–2 business days, free.",
            },
          ].map((step, index) => (
            <li key={step.title} className="y-tile flex flex-col gap-2 p-4">
              <span className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-full bg-(--b-bg)" aria-hidden>
                  {step.icon}
                </span>
                <span className="y-small font-semibold">
                  {index + 1}. {step.title}
                </span>
              </span>
              <p className="y-small y-fg-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </Block>

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
