"use client";

import { CommissionAgainBlock } from "@/components/business/commission-again";
import { DashboardSkeleton } from "@/components/business/dashboard-skeleton";
import { Greeting } from "@/components/business/greeting";
import { InProgress } from "@/components/business/in-progress";
import { NextStepBlock } from "@/components/business/next-step-block";
import { OpenRequests } from "@/components/business/open-requests";
import { AppShell } from "@/components/shell/app-shell";
import { Page } from "@/components/ui/page";
import { useHydrated } from "@/lib/store";

/**
 * Business home: a greeting that says what's going on, the one neon next step, what's in flight
 * (commissions, then requests) and "Commission again". Everything else lives on its own page.
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
    <>
      <Greeting className="y-enter" />
      {/* Two columns on desktop; on mobile the columns dissolve so the neon comes right after the greeting. */}
      <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-12">
        <div className="contents lg:col-span-8 lg:flex lg:min-w-0 lg:flex-col lg:gap-2">
          <InProgress className="order-2 min-w-0 lg:order-none" />
          <OpenRequests className="order-3 min-w-0 lg:order-none" />
        </div>
        <div className="contents lg:col-span-4 lg:flex lg:min-w-0 lg:flex-col lg:gap-2">
          <NextStepBlock className="y-enter order-1 min-w-0 lg:order-none" />
          <CommissionAgainBlock className="order-4 min-w-0 lg:order-none" />
        </div>
      </div>
    </>
  );
}
