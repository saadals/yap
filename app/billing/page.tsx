"use client";

import { CalendarDays, ShieldCheck } from "lucide-react";

import { BillingDetailsCard, useBillingDetails } from "@/components/money/billing-details";
import { KpiBlock } from "@/components/money/kpi";
import { PaymentMethods } from "@/components/money/payment-methods";
import { ReceiptsSection, allReceipts } from "@/components/money/receipts";
import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { Page, PageHeader, SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { NOW_ISO } from "@/lib/clock";
import { money, monthYearOf, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import {
  businessSpend,
  campaignAttention,
  commissionTotals,
  commissionsForBusiness,
  creatorById,
} from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";
import { CAMPAIGN_RELEASE_DAYS, FEE_PCT } from "@/lib/taxonomy";

export default function BillingPage() {
  return (
    <AppShell>
      <Billing />
    </AppShell>
  );
}

function Billing() {
  const s = useDemo();
  const hydrated = useHydrated();
  const details = useBillingDetails();
  const spend = businessSpend(s);
  const rows = allReceipts(s);
  // Orders only: campaign slots are paid from the campaign's own hold (`spend.campaignHeld`).
  const mine = commissionsForBusiness(s);
  const held = mine.filter((c) => c.payment.status === "held");
  const offers = mine.filter((c) => c.payment.status === "authorized");
  const onOrders = spend.held - spend.campaignHeld;
  const toReview = held.find((c) => c.status === "delivered");
  const reviewCreator = toReview ? creatorById(s, toReview.creatorId) : undefined;
  const campaignToReview = toReview ? undefined : campaignAttention(s)[0];

  return (
    <Page>
      <PageHeader
        title="Billing & receipts"
        description={`You pay the price you agreed, nothing on top. It's charged when you hire or post a campaign and held until the work is released; a refund returns all of it. Yapp's ${FEE_PCT}% fee comes out of the creator's pay.`}
      />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
        <Block
          as="section"
          aria-labelledby="protected-title"
          tone="paper"
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
              <>
                {spend.held > 0 ? (
                  <p className="y-small y-num font-semibold">
                    In campaigns {money(spend.campaignHeld)} · On orders {money(onOrders)}
                  </p>
                ) : null}
                <p className="y-small y-fg-2 max-w-[56ch]">
                  {spend.held > 0
                    ? `Orders are released when you approve${held.length ? ` (${plural(held.length, "order")} in progress)` : ""}; campaign slots ${CAMPAIGN_RELEASE_DAYS} days after the creator's post is verified. Full refund if work isn't delivered.`
                    : "Nothing is held right now. Payment is charged and held when you hire, and released when you approve."}
                  {offers.length
                    ? ` ${money(spend.authorized)} more is authorized for ${plural(offers.length, "offer")} awaiting acceptance.`
                    : ""}
                </p>
              </>
            ) : null}
          </div>

          {hydrated && toReview ? (
            <div className="flex flex-col gap-3 border-t border-(--b-line) pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="y-small">
                <span className="font-semibold">{reviewCreator?.firstName ?? "A creator"} delivered.</span>{" "}
                Approve to release the {money(commissionTotals(toReview).total)} payment.
              </p>
              <PillButton href={paths.commission(toReview.id)} variant="neon" arrow className="flex-none">
                Review delivery
              </PillButton>
            </div>
          ) : hydrated && campaignToReview ? (
            <div className="flex flex-col gap-3 border-t border-(--b-line) pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="y-small">
                <span className="font-semibold">
                  {plural(campaignToReview.progress.review, "review copy", "review copies")} waiting.
                </span>{" "}
                Approve them on {campaignToReview.request.title} so creators can post.
              </p>
              <PillButton href={paths.order(campaignToReview.request.id)} variant="neon" arrow className="flex-none">
                Review videos
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
          <ReceiptsSection key={s.activeAccountId} rows={rows} details={details} />
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
