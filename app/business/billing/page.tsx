"use client";

import { CalendarDays, ChevronRight, Hourglass, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";

import { CommissionBadge } from "@/components/domain/status-badge";
import { BillingDetailsForm, useBillingDetails } from "@/components/money/billing-details";
import { KpiBlock } from "@/components/money/kpi";
import { PaymentMethods } from "@/components/money/payment-methods";
import { ReceiptsSection } from "@/components/money/receipts";
import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { Page, PageHeader, SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { NOW_ISO } from "@/lib/clock";
import { money, monthYearOf, plural } from "@/lib/format";
import { businessSpend, commissionTotals, creatorById, receipts } from "@/lib/selectors";
import { ME, useDemo, useHydrated } from "@/lib/store";
import { AUTO_APPROVE_DAYS } from "@/lib/taxonomy";

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
        description="Payments are held safely until you approve the work. The 10% service fee is only charged when a commission completes."
      />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
        <Block
          as="section"
          aria-labelledby="protected-title"
          tone="sky"
          pad="md"
          className="flex flex-col gap-5 lg:col-span-7"
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
            <p className="y-small y-fg-2 max-w-[52ch]">
              Held by Yapp, not paid out. Each payment is released to the creator only when you
              approve, or automatically {AUTO_APPROVE_DAYS} days after delivery if you don&apos;t
              respond. If work isn&apos;t delivered, you get a full refund.
            </p>
          </div>

          {hydrated && held.length > 0 ? (
            <ul className="flex flex-col gap-1.5" aria-label="Held payments">
              {held.map((c) => {
                const creator = creatorById(s, c.creatorId);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/business/commissions/${c.id}`}
                      className="y-tile y-hoverable flex items-center gap-3 p-2.5 pe-3"
                    >
                      {creator ? <FaceAvatar id={creator.id} name="" size={36} /> : null}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="y-small truncate font-semibold">{c.title}</span>
                        <span className="y-micro y-fg-2 truncate">{creator?.name}</span>
                      </span>
                      <CommissionBadge status={c.status} className="hidden !min-h-6 !px-2 text-xs sm:inline-flex" />
                      <span className="y-small y-num flex-none font-semibold">
                        {money(commissionTotals(c).total)}
                      </span>
                      <ChevronRight size={16} aria-hidden className="y-flip flex-none" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : hydrated ? (
            <p className="y-small">
              Nothing is held right now. When a creator accepts your offer, the payment is held here
              until you approve.
            </p>
          ) : null}

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

        <div className="grid grid-cols-2 gap-2 lg:col-span-5">
          <KpiBlock
            label="Awaiting acceptance"
            icon={<Hourglass size={16} aria-hidden />}
            value={money(spend.authorized)}
            loading={!hydrated}
            sub={
              offers.length
                ? `${plural(offers.length, "offer")} authorised, not charged. Released if declined.`
                : "No offers waiting on a creator."
            }
          />
          <KpiBlock
            label="Spent this month"
            icon={<CalendarDays size={16} aria-hidden />}
            value={money(spend.thisMonth)}
            loading={!hydrated}
            sub={`Released in ${monthYearOf(NOW_ISO)}`}
          />
          <KpiBlock
            tone="butter"
            label="Lifetime spent"
            icon={<Wallet size={16} aria-hidden />}
            value={money(spend.spent)}
            loading={!hydrated}
            className="col-span-2"
            sub={`${plural(spend.completedCount, "completed commission")} · ${money(spend.fees, true)} in service fees`}
          />
        </div>
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
        <Block
          as="section"
          aria-labelledby="methods-title"
          tone="paper"
          pad="md"
          className="flex flex-col gap-4 lg:col-span-6"
        >
          <div className="flex flex-col gap-1">
            <h3 id="methods-title" className="y-display y-title">
              Payment methods
            </h3>
            <p className="y-small y-fg-2">
              Your default card is used when you hire or send an offer. You can pick another at checkout.
            </p>
          </div>
          {hydrated ? <PaymentMethods /> : <Skeleton className="h-16 w-full !rounded-(--y-r-tile)" />}
        </Block>
        <Block
          as="section"
          aria-labelledby="details-title"
          tone="paper"
          pad="md"
          className="flex flex-col gap-4 lg:col-span-6"
        >
          <div className="flex flex-col gap-1">
            <h3 id="details-title" className="y-display y-title">
              Billing details
            </h3>
            <p className="y-small y-fg-2">Printed on every receipt and used for VAT.</p>
          </div>
          <BillingDetailsForm />
        </Block>
      </div>
    </Page>
  );
}
