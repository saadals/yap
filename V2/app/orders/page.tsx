"use client";

import { Suspense } from "react";

import { OrdersPage } from "@/components/brand-home/orders-page";
import { AppShell } from "@/components/shell/app-shell";

/** Everything you ordered: in progress, open for pitches, done. */
export default function Orders() {
  return (
    <AppShell>
      <Suspense>
        <OrdersPage />
      </Suspense>
    </AppShell>
  );
}
