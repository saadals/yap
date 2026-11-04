"use client";

import { Suspense } from "react";

import { Inbox, InboxFallback } from "@/components/inbox/inbox";
import { AppShell } from "@/components/shell/app-shell";
import { Page } from "@/components/ui/page";

export default function BusinessMessagesPage() {
  return (
    <AppShell role="business">
      <Page>
        <Suspense fallback={<InboxFallback />}>
          <Inbox role="business" />
        </Suspense>
      </Page>
    </AppShell>
  );
}
