"use client";

import { AlertsPage } from "@/components/inbox/alerts-page";
import { AppShell } from "@/components/shell/app-shell";

/** Notifications: the phone's Alerts tab. Desktop opens the same list from the bell. */
export default function AlertsRoute() {
  return (
    <AppShell>
      <AlertsPage />
    </AppShell>
  );
}
