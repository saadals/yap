"use client";

import { useParams } from "next/navigation";

import { OpportunityView } from "@/components/opportunity/opportunity-view";
import { OrderOwnerView } from "@/components/order-owner/order-owner-view";
import { AppShell } from "@/components/shell/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { paths } from "@/lib/paths";
import { me, requestById } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

/**
 * One URL per order for everyone. The owner manages it (pitches, or a campaign's slots) in
 * Ordering; anyone else sees it as an opportunity in Studio (pitch, or "Pick now" on a campaign).
 * Owner views: components/order-owner. Opportunity view: components/opportunity.
 */
export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const s = useDemo();
  const hydrated = useHydrated();
  const request = requestById(s, id);

  // `detail` on every state (no tab bar; the page's phone action bar sits at the bottom edge).
  if (!request) {
    return (
      <AppShell detail>
        <Page>
          {hydrated ? (
            <EmptyState
              title="This order isn't here"
              body="It may have been deleted, or the link is from another demo session."
              action={
                <PillButton href={paths.orders()} variant="contrast">
                  Back to orders
                </PillButton>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}
        </Page>
      </AppShell>
    );
  }

  const owner = request.businessId === me.ids(s).businessId;
  return owner ? (
    <AppShell mode="order" detail back={{ href: paths.orders(), label: "Orders" }}>
      <OrderOwnerView request={request} />
    </AppShell>
  ) : (
    <AppShell
      mode="studio"
      detail
      back={{ href: request.kind === "campaign" && request.campaign ? paths.findWork({ kind: "campaign" }) : paths.findWork(), label: "Find work" }}
    >
      <OpportunityView request={request} />
    </AppShell>
  );
}
