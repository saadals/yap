"use client";

import { ActiveCommissions } from "@/components/business/active-commissions";
import { ActivityFeed } from "@/components/business/activity-feed";
import { CommissionAgainBlock } from "@/components/business/commission-again";
import { DashboardSkeleton } from "@/components/business/dashboard-skeleton";
import { GreetingHero } from "@/components/business/greeting-hero";
import { MoneyBlocks } from "@/components/business/money-blocks";
import { NextStepBlock } from "@/components/business/next-step-block";
import { OpenRequests } from "@/components/business/open-requests";
import { RecommendedCreators } from "@/components/business/recommended-creators";
import { AppShell } from "@/components/shell/app-shell";
import { Page } from "@/components/ui/page";
import { useHydrated } from "@/lib/store";

/**
 * Business home: what needs me (hero + the one neon next step), what's moving (commissions,
 * requests, money), and what to do next (commission again, good fits, activity).
 */
export default function BusinessHomePage() {
  return (
    <AppShell role="business">
      <Page>
        <Dashboard />
      </Page>
    </AppShell>
  );
}

function Dashboard() {
  const hydrated = useHydrated();
  if (!hydrated) return <DashboardSkeleton />;
  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 [&>*]:min-w-0">
      <GreetingHero className="y-enter lg:col-span-8" />
      <NextStepBlock className="y-enter lg:col-span-4" />

      <ActiveCommissions className="lg:col-span-8" />
      <MoneyBlocks className="lg:col-span-4" />

      <OpenRequests className="lg:col-span-7" />
      <CommissionAgainBlock className="lg:col-span-5" />

      <ActivityFeed className="lg:col-span-7" />
      <RecommendedCreators className="lg:col-span-5" />
    </div>
  );
}
