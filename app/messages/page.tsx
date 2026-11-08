"use client";

import { Suspense } from "react";

import { Inbox, InboxFallback } from "@/components/inbox/inbox";
import { AppShell } from "@/components/shell/app-shell";
import { Page } from "@/components/ui/page";

export default function MessagesPage() {
  return (
    <AppShell>
      <Page>
        <Suspense fallback={<InboxFallback />}>
          <Inbox />
        </Suspense>
      </Page>
    </AppShell>
  );
}
