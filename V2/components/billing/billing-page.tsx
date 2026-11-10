"use client";

import { ShieldCheck } from "lucide-react";

import { Block } from "@/components/ui/block";
import { Page, PageHeader, SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { NOW_ISO } from "@/lib/clock";
import { money, monthYearOf, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { businessSpend, campaignAttention, commissionTotals, commissionsForBusiness, creatorById } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";
import { CAMPAIGN_RELEASE_DAYS, SERVICE_FEE_RATE } from "@/lib/taxonomy";

import { BillingDetailsCard, useBillingDetails } from "./billing-details";
import { PaymentMethods } from "./payment-methods";
import { Receipts, allReceipts } from "./receipts";

const FEE_PCT = Math.round(SERVICE_FEE_RATE * 100);

/** What's held right now, as one light big number, and the next step that releases money. */
function HeldCard() {
  const s = useDemo();
  const spend = businessSpend(s);
  // Orders only: campaign slots are paid from the campaign's own hold (`spend.campaignHeld`).
  const mine = commissionsForBusiness(s);
  const held = mine.filter((c) => c.payment.status === "held");
  const offers = mine.filter((c) => c.payment.status === "authorized");
  const onOrders = spend.held - spend.campaignHeld;
  const toReview = held.find((c) => c.status === "delivered");
  const reviewCreator = toReview ? creatorById(s, toReview.creatorId) : undefined;
  const campaignToReview = toReview ? undefined : campaignAttention(s)[0];

  return (
    <Block as="section" aria-labelledby="held-title" tone="paper" pad="md" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 id="held-title" className="y-small flex items-center gap-2 font-medium">
          <ShieldCheck size={17} aria-hidden /> Held for your orders
        </h2>
        <p className="y-display y-num text-[40px] leading-none tracking-[-0.03em] md:text-[48px]">{money(spend.held)}</p>
        {spend.held > 0 ? (
          <p className="y-small y-num">
            {money(onOrders)} on orders · {money(spend.campaignHeld)} in campaigns
          </p>
        ) : null}
        <p className="y-small y-fg-2 max-w-[60ch]">
          {spend.held > 0
            ? `Released to the creator when you approve${held.length ? ` (${plural(held.length, "order")} in progress)` : ""}, and on campaigns ${CAMPAIGN_RELEASE_DAYS} days after each creator's post is verified. A full refund, fee included, if work isn't delivered.`
            : "Nothing is held right now. Payment is charged and held when you hire, and released when you approve."}
          {offers.length
            ? ` ${money(spend.authorized)} more is authorized for ${plural(offers.length, "offer")} waiting to be accepted; nothing is charged until then.`
            : ""}
        </p>
      </div>

      {toReview ? (
        <div className="flex flex-col gap-3 border-t border-(--b-line) pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="y-small">
            <span className="font-medium">{reviewCreator?.firstName ?? "A creator"} delivered.</span>{" "}
            <span className="y-fg-2">Approve to release {money(commissionTotals(toReview).creatorEarns)}.</span>
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
          Spent in {monthYearOf(NOW_ISO)}: {money(spend.thisMonth)} · {money(spend.spent)} since you joined
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
        description={`You pay when you hire or post a campaign, plus Yapp's ${FEE_PCT}% service fee. Both are held until the work is approved, and a refund returns the fee too.`}
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
