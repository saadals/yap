"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Browse } from "@/components/discovery/browse";
import { AppShell } from "@/components/shell/app-shell";
import { Page, PageHeader } from "@/components/ui/page";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { paths, type ExploreTab } from "@/lib/paths";
import { me } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { OrdersFeed } from "./orders-feed";

const isTab = (value: string | null): value is ExploreTab => value === "creators" || value === "orders";

/**
 * /explore: the search tab. Creators to order from, or open orders to pitch on and take slots in.
 * Opens on Orders for accounts with a creator profile, Creators otherwise (`?tab=` overrides).
 */
export function ExplorePage() {
  return (
    <AppShell>
      <Page>
        <Suspense fallback={<ExploreSkeleton />}>
          <Explore />
        </Suspense>
      </Page>
    </AppShell>
  );
}

function ExploreSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-3 px-1 pt-2 pb-5">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-11 w-56" />
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <Skeleton className="h-56 !rounded-(--y-r-block)" />
        <Skeleton className="h-56 !rounded-(--y-r-block)" />
      </div>
    </div>
  );
}

function Explore() {
  const params = useSearchParams();
  const router = useRouter();
  const s = useDemo();
  const hydrated = useHydrated();
  const requested = params.get("tab");
  // The default depends on who's signed in, so wait for the saved state unless the URL says.
  if (!isTab(requested) && !hydrated) return <ExploreSkeleton />;
  const tab: ExploreTab = isTab(requested) ? requested : me.creator(s) ? "orders" : "creators";

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        className="!pb-3 md:!pb-4"
        title="Discover"
        description={
          tab === "creators"
            ? "Creators who make videos for apps like yours."
            : "Open orders: take a campaign slot or pitch on a request."
        }
        actions={
          <SegmentedToggle
            label="Discover"
            size="md"
            className="bg-(--y-paper)"
            value={tab}
            onChange={(next) => router.replace(paths.explore(next), { scroll: false })}
            options={[
              { value: "creators", label: "Creators" },
              { value: "orders", label: "Orders" },
            ]}
          />
        }
      />
      {tab === "creators" ? <Browse embedded /> : <OrdersFeed />}
    </div>
  );
}
