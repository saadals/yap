"use client";

import { Suspense } from "react";

import { Inbox, InboxFallback } from "@/components/inbox/inbox";
import { AppShell } from "@/components/shell/app-shell";
import { Page } from "@/components/ui/page";

export default function CreatorMessagesPage() {
  return (
    <AppShell role="creator">
      <Page>
        <Suspense fallback={<InboxFallback />}>
          <Inbox role="creator" />
        </Suspense>
      </Page>
    </AppShell>
  );
}
