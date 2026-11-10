"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { Browse } from "@/components/discovery/browse";
import { AppShell } from "@/components/shell/app-shell";
import { Page, PageHeader } from "@/components/ui/page";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { paths } from "@/lib/paths";

/**
 * /explore: creators to order from. Open orders live in Find work (round 3 answers, item 32: one
 * data source, and the full board is Find work), so the Orders tab goes there and an old
 * `?tab=orders` link is sent there too.
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
  const orders = params.get("tab") === "orders";
  useEffect(() => {
    if (orders) router.replace(paths.findWork());
  }, [orders, router]);
  if (orders) return <ExploreSkeleton />;

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        className="!pb-3 md:!pb-4"
        title="Discover"
        description="Creators who make videos for apps like yours."
        actions={
          <SegmentedToggle
            label="Discover"
            size="md"
            className="bg-(--y-paper)"
            value="creators"
            onChange={(next) => {
              if (next === "orders") router.push(paths.findWork());
            }}
            options={[
              { value: "creators", label: "Creators" },
              { value: "orders", label: "Orders" },
            ]}
          />
        }
      />
      <Browse embedded />
    </div>
  );
}
