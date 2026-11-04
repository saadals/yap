"use client";

import { CalendarDays, ShieldCheck } from "lucide-react";

import { BillingDetailsCard, useBillingDetails } from "@/components/money/billing-details";
import { KpiBlock } from "@/components/money/kpi";
import { PaymentMethods } from "@/components/money/payment-methods";
import { ReceiptsSection } from "@/components/money/receipts";
import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { Page, PageHeader, SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { NOW_ISO } from "@/lib/clock";
import { money, monthYearOf, plural } from "@/lib/format";
import { businessSpend, commissionTotals, creatorById, receipts } from "@/lib/selectors";
import { ME, useDemo, useHydrated } from "@/lib/store";

export default function BillingPage() {
  return (
    <AppShell role="business">
      <Billing />
    </AppShell>
  );
}

function Billing() {
  const s = useDemo();
  const hydrated = useHydrated();
  const details = useBillingDetails();
  const spend = businessSpend(s);
  const rows = receipts(s);
  const mine = s.commissions.filter((c) => c.businessId === ME.businessId);
  const held = mine.filter((c) => c.payment.status === "held");
  const offers = mine.filter((c) => c.payment.status === "authorized");
  const toReview = held.find((c) => c.status === "delivered");
  const reviewCreator = toReview ? creatorById(s, toReview.creatorId) : undefined;

  return (
    <Page>
      <PageHeader
        title="Billing & receipts"
        description="The 10% service fee is only charged when a commission completes."
      />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
        <Block
          as="section"
          aria-labelledby="protected-title"
          tone="sky"
          pad="md"
          className="flex flex-col justify-between gap-5 lg:col-span-8"
        >
          <div className="flex flex-col gap-1.5">
            <h2 id="protected-title" className="y-small flex items-center gap-2 font-semibold">
              <ShieldCheck size={18} aria-hidden /> Protected right now
            </h2>
            {hydrated ? (
              <p className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em] md:text-[56px]">
                {money(spend.held)}
              </p>
            ) : (
              <Skeleton className="h-12 w-40" />
            )}
            {hydrated ? (
              <p className="y-small y-fg-2 max-w-[56ch]">
                {held.length
                  ? `Held for ${plural(held.length, "commission")} until you approve. Full refund if work isn't delivered.`
                  : "Nothing is held right now. Payment is held when a creator starts, and released when you approve."}
                {offers.length
                  ? ` ${money(spend.authorized)} more is authorised for ${plural(offers.length, "offer")} awaiting acceptance.`
                  : ""}
              </p>
            ) : null}
          </div>

          {hydrated && toReview ? (
            <div className="flex flex-col gap-3 border-t border-(--b-line) pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="y-small">
                <span className="font-semibold">{reviewCreator?.firstName ?? "A creator"} delivered.</span>{" "}
                Approve to release {money(commissionTotals(toReview).creatorEarns)}.
              </p>
              <PillButton href={`/business/commissions/${toReview.id}`} variant="neon" arrow className="flex-none">
                Review delivery
              </PillButton>
            </div>
          ) : null}
        </Block>

        <KpiBlock
          label="Spent this month"
          icon={<CalendarDays size={16} aria-hidden />}
          value={money(spend.thisMonth)}
          loading={!hydrated}
          className="lg:col-span-4"
          sub={`${monthYearOf(NOW_ISO)} · ${money(spend.spent)} lifetime`}
        />
      </div>

      <SectionLabel id="receipts-title">Receipts</SectionLabel>
      <Block as="section" aria-labelledby="receipts-title" tone="paper" pad="md">
        {hydrated ? (
          <ReceiptsSection rows={rows} details={details} />
        ) : (
          <div className="flex flex-col gap-3" aria-hidden>
            <Skeleton className="h-11 w-2/3 !rounded-full" />
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-14 w-full !rounded-(--y-r-tile)" />
            ))}
          </div>
        )}
      </Block>

      <SectionLabel>How you pay</SectionLabel>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
        <Block as="section" aria-labelledby="methods-title" tone="paper" pad="md" className="lg:col-span-7">
          {hydrated ? (
            <PaymentMethods titleId="methods-title" />
          ) : (
            <Skeleton className="h-16 w-full !rounded-(--y-r-tile)" />
          )}
        </Block>
        <Block as="section" aria-labelledby="details-title" tone="paper" pad="md" className="lg:col-span-5">
          <BillingDetailsCard titleId="details-title" />
        </Block>
      </div>
    </Page>
  );
}
