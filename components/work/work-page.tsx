"use client";

import { ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { CommissionAgainBlock } from "@/components/business/commission-again";
import { CommissionList } from "@/components/commission/commission-list";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { money, plural } from "@/lib/format";
import { type WorkTab, paths } from "@/lib/paths";
import {
  businessSpend,
  commissionsForBusiness,
  creatorEarnings,
  isActive,
  me,
  pastCollaborators,
  pitchesForCreator,
} from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { needsYou } from "./needs-you";
import { NeedsYouBlock } from "./needs-you-block";
import { YourOrders } from "./your-orders";

const tabs: { value: WorkTab; label: string }[] = [
  { value: "ordered", label: "Ordered" },
  { value: "making", label: "Making" },
];

/**
 * Work: everything in flight for this account, on both sides of a deal. One neon "Needs you" step
 * (most urgent first, across both sides), then Ordered · Making (`?tab=`). Ordered adds your open
 * orders; Making covers campaign slots too. Uses `useSearchParams`: render inside <Suspense>.
 */
export function WorkPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const router = useRouter();
  const [setupOpen, setSetupOpen] = useState(false);

  if (!hydrated) return <WorkSkeleton />;

  const step = needsYou(s);
  const param = params.get("tab");
  const tab: WorkTab =
    param === "ordered" || param === "making"
      ? param
      : step.urgent && step.side === "creator"
        ? "making"
        : "ordered";
  const hasCreator = Boolean(me.creator(s));

  return (
    <Page>
      <PageHeader title="Work" />
      <NeedsYouBlock step={step} showSide={hasCreator} className="y-enter" />

      <div className="flex flex-col gap-3 px-1 pt-8 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedToggle
          label="Show work"
          options={tabs}
          value={tab}
          onChange={(next) => router.replace(paths.work(next), { scroll: false })}
          size="md"
          className="w-full sm:w-fit [&>button]:flex-1 sm:[&>button]:min-w-32"
        />
        <MoneyLine tab={tab} />
      </div>

      <div key={tab} className="y-enter">
        {tab === "ordered" ? <OrderedView /> : <MakingView hasCreator={hasCreator} onSetUp={() => setSetupOpen(true)} />}
      </div>

      <CreatorSetupSheet
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        reason="to make videos on Yapp"
        onDone={() => {
          setSetupOpen(false);
          router.replace(paths.work("making"), { scroll: false });
        }}
      />
    </Page>
  );
}

/** One quiet money line for the side on show: what's held for your orders, or what's coming to you. */
function MoneyLine({ tab }: { tab: WorkTab }) {
  const s = useDemo();
  if (tab === "ordered") {
    // Charged and held only, the same figure as Billing's "Protected right now" (an offer's authorization isn't held yet).
    const held = businessSpend(s).held;
    if (!held) return null;
    return (
      <p className="y-small y-fg-2 inline-flex items-center gap-2">
        <ShieldCheck size={16} aria-hidden className="flex-none" />
        <span>
          <span className="y-num font-semibold text-(--y-ink)">{money(held)}</span> held for your orders ·{" "}
          <Link href={paths.billing} className="y-link font-semibold text-(--y-ink)">
            Billing
          </Link>
        </span>
      </p>
    );
  }
  if (!me.creator(s)) return null;
  const earnings = creatorEarnings(s);
  const parts = [
    earnings.available ? `${money(earnings.available)} to withdraw` : "",
    earnings.pending ? `${money(earnings.pending)} pending` : "",
    earnings.held ? `${money(earnings.held)} held for you` : "",
  ]
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return null;
  return (
    <p className="y-small y-fg-2 inline-flex items-center gap-2">
      <Wallet size={16} aria-hidden className="flex-none" />
      <span>
        <span className="y-num">{parts.join(" · ")}</span> ·{" "}
        <Link href={paths.wallet} className="y-link font-semibold text-(--y-ink)">
          Wallet
        </Link>
      </span>
    </p>
  );
}

function OrderedView() {
  const s = useDemo();
  const active = commissionsForBusiness(s).some(isActive);
  // "Commission again" only when nothing is in flight (campaign creators aren't rebooked one by one).
  const again = !active && pastCollaborators(s).some((entry) => entry.last.source !== "campaign");
  return (
    <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-12 [&>*]:min-w-0">
      <div className="lg:col-span-8">
        <CommissionList side="business" />
      </div>
      <div className="flex flex-col gap-2 lg:col-span-4">
        <YourOrders />
        {again ? <CommissionAgainBlock /> : null}
      </div>
    </div>
  );
}

function MakingView({ hasCreator, onSetUp }: { hasCreator: boolean; onSetUp: () => void }) {
  const s = useDemo();
  if (!hasCreator) {
    return (
      <Block tone="paper" pad="lg">
        <EmptyState
          headingLevel={2}
          shape="bean"
          tint="violet"
          face="smile"
          title="Make videos on Yapp too"
          body="Set up a creator profile to take campaign slots and pitch on requests. Same account, same login."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <PillButton variant="contrast" onClick={onSetUp}>
                Set up your creator profile
              </PillButton>
              <PillButton variant="ghost" href={paths.explore("orders")}>
                See what&apos;s open
              </PillButton>
            </div>
          }
        />
      </Block>
    );
  }
  const waiting = pitchesForCreator(s).filter((p) => ["sent", "viewed", "shortlisted"].includes(p.status)).length;
  return (
    <div className="flex flex-col gap-4">
      <CommissionList side="creator" wide />
      <p className="y-small y-fg-2 px-1">
        {waiting ? `${plural(waiting, "pitch", "pitches")} waiting to hear back · ` : ""}
        <Link href={paths.pitches} className="y-link font-semibold text-(--y-ink)">
          Your pitches
        </Link>
      </p>
    </div>
  );
}

/** Placeholder in the page's shape until the saved demo state has loaded. */
export function WorkSkeleton() {
  return (
    <Page>
      <div aria-busy="true" aria-label="Loading your work">
        <div className="px-1 pt-2 pb-5 md:pb-6">
          <Skeleton className="h-12 w-40" />
        </div>
        <div data-tone="mist" className="y-block y-pad-md flex flex-col gap-3" aria-hidden>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex gap-2 px-1 pt-8 pb-3" aria-hidden>
          <Skeleton className="h-12 w-64 !rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-12" aria-hidden>
          <div className="flex flex-col gap-2 lg:col-span-8">
            <Skeleton className="h-10 w-full !rounded-full" />
            <div className="grid gap-2 md:grid-cols-2">
              <Skeleton className="h-40 w-full !rounded-(--y-r-block)" />
              <Skeleton className="h-40 w-full !rounded-(--y-r-block)" />
            </div>
          </div>
          <div data-tone="paper" className="y-block y-pad-md flex flex-col gap-3 lg:col-span-4">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </Page>
  );
}
