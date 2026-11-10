"use client";

import { ShieldCheck } from "lucide-react";

import { Block } from "@/components/ui/block";
import { Page, PageHeader, SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { autoApproveAt } from "@/lib/attention";
import { NOW_ISO } from "@/lib/clock";
import { money, monthYearOf, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { businessSpend, campaignAttention, commissionTotals, commissionsForBusiness, creatorById } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";
import { CAMPAIGN_RELEASE_DAYS } from "@/lib/taxonomy";

import { BillingDetailsCard, useBillingDetails } from "./billing-details";
import { PaymentMethods } from "./payment-methods";
import { Receipts, allReceipts } from "./receipts";

/** What's held right now, as one light big number, and the next step that releases money. */
function HeldCard() {
  const s = useDemo();
  const spend = businessSpend(s);
  // Orders only: campaign slots are paid from the campaign's own hold (`spend.campaignHeld`).
  const mine = commissionsForBusiness(s);
  const held = mine.filter((c) => c.payment.status === "held");
  const offers = mine.filter((c) => c.payment.status === "authorized");
  const onOrders = spend.held - spend.campaignHeld;
  // The delivery that approves itself soonest (Home's Needs you order).
  const toReview = held
    .filter((c) => c.status === "delivered")
    .sort((a, b) => Date.parse(autoApproveAt(a)) - Date.parse(autoApproveAt(b)))[0];
  const reviewCreator = toReview ? creatorById(s, toReview.creatorId) : undefined;
  const campaignToReview = toReview ? undefined : campaignAttention(s)[0];
  // When each part of the held money is released (orders and campaigns differ), said once.
  const releaseLine = [
    onOrders > 0 ? "Orders are released when you approve" : null,
    spend.campaignHeld > 0
      ? `${onOrders > 0 ? "campaign" : "Campaign"} slots ${CAMPAIGN_RELEASE_DAYS} days after each creator's post is verified`
      : null,
  ]
    .filter(Boolean)
    .join("; ")
    .concat(". Full refund if work isn't delivered.");

  return (
    <Block as="section" aria-labelledby="held-title" tone="paper" pad="md" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 id="held-title" className="y-small flex items-center gap-2 font-medium">
          <ShieldCheck size={17} aria-hidden /> Held for your orders
        </h2>
        <p className="y-display y-num text-[40px] leading-none tracking-[-0.03em] md:text-[48px]">{money(spend.held)}</p>
        {onOrders > 0 && spend.campaignHeld > 0 ? (
          <p className="y-small y-num">
            {money(onOrders)} on orders · {money(spend.campaignHeld)} in campaigns
          </p>
        ) : null}
        <p className="y-small y-fg-2 max-w-[60ch]">
          {spend.held > 0 ? releaseLine : "Nothing is held right now. Payment is charged and held when you hire, and released when you approve."}
          {offers.length
            ? ` ${money(spend.authorized)} more is authorized for ${offers.length === 1 ? "an offer" : plural(offers.length, "offer")} waiting to be accepted, not charged yet.`
            : ""}
        </p>
      </div>

      {toReview ? (
        <div className="flex flex-col gap-3 border-t border-(--b-line) pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="y-small">
            <span className="font-medium">{reviewCreator?.firstName ?? "A creator"} delivered.</span>{" "}
            <span className="y-fg-2">Approve to release {money(commissionTotals(toReview).total)}.</span>
          </p>
          <PillButton href={paths.job(toReview.id)} variant="neon" arrow className="flex-none">
            Review delivery
          </PillButton>
        </div>
      ) : campaignToReview ? (
        <div className="flex flex-col gap-3 border-t border-(--b-line) pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="y-small">
            <span className="font-medium">{plural(campaignToReview.progress.review, "review copy", "review copies")} waiting.</span>{" "}
            <span className="y-fg-2">Approve them so creators can post.</span>
          </p>
          <PillButton href={paths.order(campaignToReview.request.id)} variant="neon" arrow className="flex-none">
            Review videos
          </PillButton>
        </div>
      ) : null}

      {spend.spent > 0 ? (
        <p className="y-micro y-fg-2 y-num border-t border-(--b-line) pt-3">
          {spend.thisMonth > 0 ? `Spent in ${monthYearOf(NOW_ISO)}: ${money(spend.thisMonth)} · ` : ""}
          {money(spend.spent)} spent since you joined
        </p>
      ) : null}
    </Block>
  );
}

/**
 * /billing: money for your orders. What's held now (one big number) with the step that releases
 * it, receipts as rows (campaign ledger lines included), and in a side rail the cards you pay with
 * and the details printed on receipts.
 */
export function BillingPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const details = useBillingDetails();

  return (
    <Page>
      <PageHeader
        title="Billing"
        description="You pay the listed price, nothing on top. It's charged when you hire or post a campaign and held until the work is approved; a refund returns all of it."
      />

      {!hydrated ? (
        <div className="grid gap-6 lg:grid-cols-12" aria-busy="true" aria-label="Loading billing">
          <div className="flex flex-col gap-3 lg:col-span-8" aria-hidden>
            <Skeleton className="h-56 w-full !rounded-(--y-r-block)" />
            <Skeleton className="mt-6 h-5 w-24" />
            <Skeleton className="h-72 w-full !rounded-(--y-r-block)" />
          </div>
          <div className="flex flex-col gap-3 lg:col-span-4" aria-hidden>
            <Skeleton className="h-40 w-full !rounded-(--y-r-block)" />
            <Skeleton className="h-32 w-full !rounded-(--y-r-block)" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <HeldCard />
            <SectionLabel id="receipts-title">Receipts</SectionLabel>
            <section aria-labelledby="receipts-title">
              <Receipts key={s.activeAccountId} rows={allReceipts(s)} details={details} />
            </section>
          </div>
          <aside aria-label="How you pay" className="flex min-w-0 flex-col gap-3 pt-8 lg:col-span-4 lg:pt-0">
            <Block tone="paper" pad="md">
              <PaymentMethods />
            </Block>
            <Block tone="paper" pad="md">
              <BillingDetailsCard />
            </Block>
          </aside>
        </div>
      )}
    </Page>
  );
}
