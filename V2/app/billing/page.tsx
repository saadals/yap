"use client";

import { BillingPage } from "@/components/billing/billing-page";
import { AppShell } from "@/components/shell/app-shell";

/** Receipts, payment methods and money held for your orders. */
export default function Billing() {
  return (
    <AppShell>
      <BillingPage />
    </AppShell>
  );
}
