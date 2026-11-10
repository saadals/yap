"use client";

import { NotificationList } from "@/components/shell/notifications-sheet";
import { Block } from "@/components/ui/block";
import { Page, PageHeader } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { plural } from "@/lib/format";
import { notificationsFor } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

/**
 * /alerts: everything that happened on your orders and your work, newest first (round 3 answers,
 * item 19: Messages and Alerts are two tabs). Opening an alert marks it read and goes to it.
 */
export function AlertsPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const unread = notificationsFor(s).filter((n) => n.unread).length;
  return (
    <Page width="narrow">
      <PageHeader
        title="Alerts"
        description={hydrated ? (unread ? `${plural(unread, "new alert")}` : "You're all caught up") : undefined}
      />
      <Block as="section" aria-label="Alerts" tone="paper" pad="md">
        {hydrated ? (
          <NotificationList />
        ) : (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading alerts">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full !rounded-(--y-r-tile)" />
            ))}
          </div>
        )}
      </Block>
    </Page>
  );
}
