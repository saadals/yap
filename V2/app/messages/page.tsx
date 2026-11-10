"use client";

import { Suspense } from "react";

import { Inbox, InboxFallback } from "@/components/inbox/inbox";

/** Inbox: Messages and Alerts, for both modes. */
export default function MessagesPage() {
  return (
    <Suspense fallback={<InboxFallback />}>
      <Inbox />
    </Suspense>
  );
}
